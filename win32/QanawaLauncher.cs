/* ============================================================================
   قَنَوة — Lecteur Qanawa  (Windows, .NET Framework 4.0, aucun installateur)
   ----------------------------------------------------------------------------
   Ce que fait ce petit programme :
     1. il sert le dossier  .\prototype\  sur http://localhost:<port>  (127.0.0.1)
     2. il ouvre le navigateur par défaut sur cette adresse
     3. il garde une icône dans la zone de notification, avec « Ouvrir » / « Quitter »
   Pourquoi un serveur local plutôt qu'un double-clic sur index.html :
     - localStorage fiable et partagé (le cahier de l'élève survit aux redémarrages) ;
     - le service worker (mode hors ligne) et les workers ne marchent pas en file:// ;
     - l'URL reste identique d'un jour à l'autre, donc les repères de l'enseignant
       (exports CSV, captures) restent valables.
   Contraintes volontaires : pas de async/await, pas d'interpolation, API ≤ .NET 4.0,
   tout ce qui touche l'interface est défensif (réflexion + try/catch) — l'appli doit
   démarrer même sur un poste d'école verrouillé.
   ========================================================================== */
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Net;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;
using System.Windows.Forms;

namespace Qanawa
{
    internal static class Launcher
    {
        private static HttpListener _listener;
        private static int _port;
        private static string _root;
        private static Form _form;
        private static object _tray;
        private static volatile bool _stopping;

        [STAThread]
        private static int Main(string[] args)
        {
            bool gui = true, browser = true, lan = false, fallbackFile = false;
            string problem = null;
            for (int i = 0; i < args.Length; i++)
            {
                string a = args[i];
                if (a == "--serve-only") gui = false;
                else if (a == "--lan") lan = true;
                else if (a == "--no-browser") browser = false;
                else if (a == "--help") { Console.WriteLine("Qanawa.exe [--serve-only] [--no-browser] [--lan] [--port N] [--fallback-file] [--no-diagnostic]"); return 0; }
                else if (a == "--fallback-file") fallbackFile = true;
                else if (a == "--no-diagnostic") gui = false;
                else if (a == "--port" && i + 1 < args.Length) _port = ParseInt(args[++i], _port);
            }
            TryDpiAware();
            TryActivationContext();     // styles visuels + compat, sans rc.exe ni manifeste intégré
            bool hasContent = ResolveRoot();
            if (!hasContent)
            {
                // On sert quand même : la page 404 construite par MissingPage() explique le souci,
                // et la fenêtre de diagnostic reste ouverte sous les yeux (pas une console qui se ferme).
                _root = Path.Combine(AppDir(), "prototype");
                problem = "Le dossier « prototype » est introuvable à côté de Qanawa.exe (il est cherché aussi dans les deux niveaux au-dessus). "
                          + "L'archive a très probablement été lancée sans être décompressée : clic droit sur Qanawa-windows.zip\n"
                          + "→ « Extract All / استخراج الكل », puis relancer Qanawa.exe dans le dossier extrait.";
            }
            if (!StartServer(lan))
            {
                if (lan)
                {
                    // Le préfixe http://+:port/ demande une réservation d'URL côté Windows.
                    Fail("Mode salle refusé par Windows (préfixe http://+:" + _port + "/ non autorisé).",
                         "Dans une invite de commandes EN ADMINISTRATEUR, une seule fois :\n" +
                         "   netsh http add urlacl url=http://+:" + _port + "/ user=Everyone\n" +
                         "Puis relance :  Qanawa.exe --lan --serve-only\n" +
                         "(et le pare-feu : autoriser le port " + _port + " en réseau privé uniquement.)");
                    return 3;
                }
                if (fallbackFile && hasContent && OpenWithShell(Path.Combine(_root, "index.html")))
                {
                    Fail("Serveur local impossible à démarrer — la page a été ouverte en mode fichier.",
                         "Le surlignage et les jeux fonctionnent, mais la progression peut ne pas être conservée (file://).");
                    return 0;
                }
                Fatal("Impossible d'ouvrir le port " + _port + " sur cette machine.",
                      "Essayez un autre port :   Qanawa.exe --port 8642\n" +
                      "ou servez le dossier à la main :   cd prototype  puis  python -m http.server 8137\n" +
                      "(le micro et le mode hors ligne demandent http://localhost, pas file://)");
                return 4;
            }
            WaitForPort(4000);            // sinon le navigateur part trop tôt → page vide
            if (browser && !lan) OpenBrowser();
            if (problem != null) ShowDiagnostic(problem);   // après ouverture : l'enseignant voit les deux
            if (lan) { PrintLanAddresses(); if (problem != null) ShowDiagnostic(problem); }
            if (!gui)
            {
                Console.WriteLine("Qanawa: " + Url() + "  (Ctrl+C pour arrêter)");
                Console.In.ReadLine();
                Stop();
                return 0;
            }
            RunUi();
            Stop();
            return 0;
        }

        /* ------------------------------------------------------------------ */
        private static string Url() { return "http://localhost:" + _port + "/"; }

        private static bool ResolveRoot()
        {
            string exeDir = AppDir();
            string[] tries = new string[]
            {
                Path.Combine(exeDir, "prototype"),
                Path.Combine(exeDir, "..", "prototype"),
                Path.Combine(exeDir, "..", "..", "prototype"),
                Path.Combine(exeDir, "..", "prototype", "prototype")
            };
            for (int i = 0; i < tries.Length; i++)
            {
                try
                {
                    string p = Path.GetFullPath(tries[i]);
                    if (File.Exists(Path.Combine(p, "index.html")) && File.Exists(Path.Combine(p, "app.js")))
                    { _root = p; return true; }
                }
                catch { }
            }
            _root = null;
            return false;
        }

        private static string AppDir()
        {
            try { return Path.GetDirectoryName(Application.ExecutablePath); }
            catch { return Environment.CurrentDirectory; }
        }

        /* lan=false → http://localhost:<port>/ (un seul poste, aucune autorisation spéciale).
           lan=true  → http://+:/<port>/ (toute la salle) : exige une réservation d'URL, sinon
           Windows renvoie « Access is denied » — la commande exacte est affichée à l'écran. */
        private static bool StartServer(bool lan)
        {
            int[] prefs = _port > 0 ? new int[] { _port } : new int[] { 8137, 8138, 4173, 8777, 5151 };
            for (int i = 0; i < prefs.Length; i++)
            {
                HttpListener l = null;
                try
                {
                    l = new HttpListener();
                    l.Prefixes.Add(lan ? "http://+:" + prefs[i] + "/" : "http://localhost:" + prefs[i] + "/");
                    l.Start();
                }
                catch
                {
                    try { if (l != null) l.Close(); } catch { }
                    l = null;
                }
                if (l != null)
                {
                    _listener = l; _port = prefs[i];
                    Thread t = new Thread(new ThreadStart(AcceptLoop));
                    t.IsBackground = true;
                    t.Name = "qanawa-http";
                    t.Start();
                    return true;
                }
            }
            return false;
        }

        private static void AcceptLoop()
        {
            while (!_stopping && _listener != null && _listener.IsListening)
            {
                HttpListenerContext ctx;
                try { ctx = _listener.GetContext(); }
                catch { return; }
                try { Serve(ctx); }
                catch { try { ctx.Response.Abort(); } catch { } }
            }
        }

        private static void PrintLanAddresses()
        {
            try
            {
                Console.WriteLine();
                Console.WriteLine("  Qanawa — mode salle de classe : http://localhost:" + _port + "/");
                foreach (System.Net.IPAddress ip in System.Net.Dns.GetHostAddresses(System.Net.Dns.GetHostName()))
                {
                    if (ip.AddressFamily == System.Net.Sockets.AddressFamily.InterNetwork)
                        Console.WriteLine("     élèves : http://" + ip + ":" + _port + "/   (enseignant : http://" + ip + ":" + _port + "/teacher.html)");
                }
                Console.WriteLine();
            }
            catch { }
        }

        private static void Serve(HttpListenerContext ctx)
        {
            HttpListenerRequest req = ctx.Request;
            HttpListenerResponse res = ctx.Response;
            string path = req.Url == null ? "/" : (req.Url.AbsolutePath ?? "/");
            if (path == "/favicon.ico") { WriteBytes(res, 204, "image/x-icon", new byte[0]); return; }
            if (path == "/health") { WriteText(res, 200, "text/plain; charset=utf-8", HealthLine()); return; }
            if (path == "/") path = "/index.html";

            string rel = path.Replace('/', Path.DirectorySeparatorChar).TrimStart(Path.DirectorySeparatorChar);
            string full;
            try { full = Path.GetFullPath(Path.Combine(_root, rel)); }
            catch { WriteText(res, 400, "text/plain; charset=utf-8", "chemin invalide"); return; }
            if (!full.StartsWith(_root, StringComparison.OrdinalIgnoreCase))
            { WriteText(res, 403, "text/plain; charset=utf-8", "hors du dossier servi: " + rel); return; }
            if (!File.Exists(full))
            { WriteHtml(res, 404, MissingPage(rel)); return; }

            byte[] data;
            try { data = File.ReadAllBytes(full); }
            catch { WriteText(res, 500, "text/plain; charset=utf-8", "lecture impossible"); return; }
            WriteBytes(res, 200, Mime(full), data);
        }

        private static string HealthLine()
        {
            return "ok " + _root + " · " + (Directory.Exists(_root) ? Directory.GetFiles(_root).Length + " fichiers" : "dossier absent");
        }

        /* Une page d'erreur lisible : « écran blanc » ne doit jamais être le message renvoyé à un enseignant. */
        private static string MissingPage(string rel)
        {
            string safe = WebUtility.HtmlEncode(rel);
            return "<!doctype html><meta charset=utf-8><title>Qanawa — fichier manquant</title>" +
              "<body style=\"font:17px/1.7 system-ui,sans-serif;background:#FBF7EF;color:#2a2620;padding:24px;max-width:760px;margin:auto\">" +
              "<h2 style=\"color:#1B4F8C\">📂 الملفّ <code>" + safe + "</code> غير موجود داخل المجلد المخدوم</h2>" +
              "<p dir=\"ltr\"><b>Fichier attendu :</b> <code>" + WebUtility.HtmlEncode(Path.Combine(_root ?? "?", rel)) + "</code></p>" +
              "<p style=\"background:#FFF4D6;border:1px solid #F6C64B;padding:12px 14px;border-radius:12px\">" +
              "Cela vient presque toujours d'une <b>archive lancée sans être décompressée</b> : l'exe s'exécute alors dans un " +
              "dossier temporaire qui ne contient pas <code>prototype\\</code>.<br>" +
              "→ clic droit sur le ZIP → <b>Extract All / Extraire tout</b>, puis lancer <code>Qanawa.exe</code> dans le dossier extrait." +
              "<br><span dir=\"rtl\">استخرج الملفّ كاملاً (كليك يمين ← Extract All) ثم شغّل Qanawa.exe من المجلّد الجديد.</span></p>" +
              "<p dir=\"ltr\"><a href=\"/health\">/health</a> — <a href=\"/index.html\">/index.html</a></p></body>";
        }

        private static void WriteBytes(HttpListenerResponse res, int code, string mime, byte[] data)
        {
            res.StatusCode = code;
            res.ContentType = mime;
            res.ContentLength64 = data.LongLength;
            res.AddHeader("Cache-Control", "no-store");
            res.AddHeader("X-Content-Type-Options", "nosniff");
            if (data.LongLength > 0) { res.OutputStream.Write(data, 0, data.Length); }
            res.OutputStream.Close();
        }

        private static void WriteText(HttpListenerResponse res, int code, string mime, string text)
        { WriteBytes(res, code, mime, Encoding.UTF8.GetBytes(text)); }

        private static void WriteHtml(HttpListenerResponse res, int code, string html)
        { WriteBytes(res, code, "text/html; charset=utf-8", Encoding.UTF8.GetBytes(html)); }

        private static string Mime(string f)
        {
            string e = Path.GetExtension(f).ToLowerInvariant();
            if (e == ".html") return "text/html; charset=utf-8";
            if (e == ".js") return "text/javascript; charset=utf-8";
            if (e == ".css") return "text/css; charset=utf-8";
            if (e == ".json" || e == ".webmanifest") return "application/manifest+json";
            if (e == ".svg") return "image/svg+xml";
            if (e == ".png") return "image/png";
            if (e == ".jpg" || e == ".jpeg") return "image/jpeg";
            if (e == ".mp3") return "audio/mpeg";
            if (e == ".txt") return "text/plain; charset=utf-8";
            return "application/octet-stream";
        }

        /* On attend que le port réponde : ouvrir le navigateur avant le Start() de HttpListener
           produit exactement le symptôme remonté (« page vide »). */
        private static void WaitForPort(int ms)
        {
            int spent = 0;
            while (spent < ms)
            {
                try
                {
                    using (System.Net.Sockets.TcpClient c = new System.Net.Sockets.TcpClient())
                    {
                        IAsyncResult r = c.BeginConnect(System.Net.IPAddress.Loopback, _port, null, null);
                        if (r.AsyncWaitHandle.WaitOne(200) && c.Connected) { try { c.EndConnect(r); } catch { } return; }
                    }
                }
                catch { }
                Thread.Sleep(120); spent += 320;
            }
        }

        /* ------------------------------------------------------------ browser */
        private static void OpenBrowser()
        {
            string url = Url();
            string pf86 = Environment.GetEnvironmentVariable("ProgramFiles(x86)");
            string pf = Environment.GetEnvironmentVariable("ProgramFiles");
            List<string> exes = new List<string>();
            if (!string.IsNullOrEmpty(pf86))
            {
                exes.Add(Path.Combine(pf86, @"Microsoft\Edge\Application\msedge.exe"));
                exes.Add(Path.Combine(pf86, @"Google\Chrome\Application\chrome.exe"));
            }
            if (!string.IsNullOrEmpty(pf))
            {
                exes.Add(Path.Combine(pf, @"Microsoft\Edge\Application\msedge.exe"));
                exes.Add(Path.Combine(pf, @"Google\Chrome\Application\chrome.exe"));
            }
            string local = Environment.GetEnvironmentVariable("LOCALAPPDATA");
            if (!string.IsNullOrEmpty(local))
                exes.Add(Path.Combine(local, @"Google\Chrome\Application\chrome.exe"));
            for (int i = 0; i < exes.Count; i++)
            {
                try
                {
                    if (!File.Exists(exes[i])) continue;
                    ProcessStartInfo si = new ProcessStartInfo(exes[i], "\"" + url + "\"");
                    si.UseShellExecute = false;
                    Process.Start(si);
                    SetStatus("Navigateur ouvert (" + Path.GetFileName(exes[i]) + ")");
                    return;
                }
                catch { }
            }
            if (OpenWithShell(url)) { SetStatus("Navigateur par défaut ouvert"); return; }
            try { Process.Start("cmd.exe", "/c start \"\" \"" + url + "\""); SetStatus("Ouvert via start"); }
            catch { SetStatus("Ouvre manuellement " + url); }
        }

        private static bool OpenWithShell(string target)
        {
            try
            {
                ProcessStartInfo si = new ProcessStartInfo(target);
                si.UseShellExecute = true;
                Process.Start(si);
                return true;
            }
            catch { return false; }
        }

        /* ---------------------------------------------------------------- ui */
        private static void RunUi()
        {
            try
            {
                _form = new Form();
                _form.Text = "قَنَوة — Lecteur (fenêtre à laisser ouverte)";
                _form.FormBorderStyle = FormBorderStyle.FixedSingle;
                _form.MaximizeBox = false;
                _form.StartPosition = FormStartPosition.CenterScreen;
                _form.Width = 500; _form.Height = 232;

                Label title = new Label();
                title.Text = "قَنَوة — lecture du français, 6ème année";
                title.Font = new Font("Segoe UI", 13f, FontStyle.Bold);
                title.Left = 18; title.Top = 16; title.Width = 460;
                _form.Controls.Add(title);

                Label info = new Label();
                info.Text = "Adresse : " + Url() + "     Dossier : " + _root;
                info.Left = 18; info.Top = 50; info.Width = 460;
                _form.Controls.Add(info);

                Button open = new Button();
                open.Text = "Ouvrir dans le navigateur";
                open.Left = 18; open.Top = 88; open.Width = 210; open.Height = 40;
                open.Click += delegate { OpenBrowser(); };
                _form.Controls.Add(open);

                Button quit = new Button();
                quit.Text = "Quitter";
                quit.Left = 250; quit.Top = 88; quit.Width = 120; quit.Height = 40;
                quit.Click += delegate { _stopping = true; try { _form.Close(); } catch { } };
                _form.Controls.Add(quit);

                Label status = new Label();
                status.Name = "status";
                status.Text = "Serveur prêt sur " + Url() + ". Si le navigateur reste vide : bouton « Ouvrir » " +
                    "ci-dessus, ou relance avec --serve-only dans une invite de commandes pour lire les erreurs.";
                status.Left = 18; status.Top = 140; status.Width = 460; status.Height = 46;
                _form.Controls.Add(status);

                _form.FormClosing += delegate { _stopping = true; };
                TryTray();
                Application.Run(_form);
            }
            catch
            {
                // Pas de station de travail « normale » (session verrouillée, 16 bits, etc.) :
                // on attend que l'utilisateur coupe le processus.
                while (!_stopping) Thread.Sleep(500);
            }
        }

        /* Fenêtre de diagnostic : ne ferme pas toute seule, dit le problème en français et en arabe,
           et propose « continuer quand même » (le serveur reste actif, la page 404 explique). */
        private static void ShowDiagnostic(string problem)
        {
            Console.WriteLine();
            Console.WriteLine("  ⚠ " + problem);
            Console.WriteLine("  Le serveur reste actif sur " + Url() + " — Fermer cette fenêtre suffit à l'arrêter.");
            Console.WriteLine();
            if (_form != null) { SetStatus("⚠ " + problem); return; }
            try
            {
                Form f = new Form();
                f.Text = "Qanawa — démarrage incomplet";
                f.FormBorderStyle = FormBorderStyle.FixedSingle; f.MaximizeBox = false;
                f.StartPosition = FormStartPosition.CenterScreen; f.Width = 620; f.Height = 280;
                Label l = new Label(); l.Text = "⚠  " + problem; l.Left = 16; l.Top = 16; l.Width = 580; l.Height = 150;
                Button open = new Button(); open.Text = "Ouvrir quand même dans le navigateur"; open.Left = 16; open.Top = 180; open.Width = 270; open.Height = 40;
                open.Click += delegate { OpenBrowser(); };
                Button quit = new Button(); quit.Text = "Quitter"; quit.Left = 300; quit.Top = 180; quit.Width = 120; quit.Height = 40;
                quit.Click += delegate { _stopping = true; try { f.Close(); } catch { } };
                Label hint = new Label(); hint.Text = "Serveur : " + Url() + "   ·   diagnostic : " + Url() + "health";
                hint.Left = 16; hint.Top = 228; hint.Width = 580;
                f.Controls.Add(l); f.Controls.Add(open); f.Controls.Add(quit); f.Controls.Add(hint);
                Application.Run(f);
            }
            catch { while (!_stopping) Thread.Sleep(700); }   // pas d'interface dispo : on laisse la console lisible
        }

        private static void SetStatus(string text)
        {
            try
            {
                if (_form == null || _form.IsDisposed) return;
                Control c = _form.Controls["status"];
                if (c != null) c.Text = text;
            }
            catch { }
        }

        private static void TryTray()
        {
            try
            {
                Type t = Type.GetType("System.Windows.Forms.NotifyIcon, System.Windows.Forms", false);
                if (t == null) return;
                _tray = Activator.CreateInstance(t);
                BindingFlags flags = BindingFlags.Public | BindingFlags.Instance;
                try { t.InvokeMember("Icon", BindingFlags.SetProperty, null, _tray, new object[] { SystemIcons.Information }); } catch { }
                t.InvokeMember("Text", BindingFlags.SetProperty, null, _tray, new object[] { "Qanawa — " + Url() });
                t.InvokeMember("Visible", BindingFlags.SetProperty, null, _tray, new object[] { true });

                Type menuType = Type.GetType("System.Windows.Forms.ContextMenu, System.Windows.Forms", false);
                Type itemType = Type.GetType("System.Windows.Forms.MenuItem, System.Windows.Forms", false);
                if (menuType != null && itemType != null)
                {
                    object menu = Activator.CreateInstance(menuType);
                    object miOpen = Activator.CreateInstance(itemType, new object[] { "Ouvrir Qanawa" });
                    object miQuit = Activator.CreateInstance(itemType, new object[] { "Quitter" });
                    MenuItem openItem = miOpen as MenuItem;
                    MenuItem quitItem = miQuit as MenuItem;
                    if (openItem != null) openItem.Click += delegate { OpenBrowser(); };
                    if (quitItem != null) quitItem.Click += delegate { _stopping = true; try { _form.Close(); } catch { } };
                    menuType.InvokeMember("MenuItems", flags, null, menu, new object[] { new MenuItem[] { openItem, quitItem } });
                    t.InvokeMember("ContextMenu", BindingFlags.SetProperty, null, _tray, new object[] { menu });
                }
                t.InvokeMember("DoubleClick", BindingFlags.Public | BindingFlags.Instance, null, null, null);
                EventInfo dbl = t.GetEvent("DoubleClick");
                if (dbl != null)
                {
                    Delegate d = new EventHandler(delegate { OpenBrowser(); });
                    dbl.AddEventHandler(_tray, d);
                }
            }
            catch { }
        }

        /* ------------------------------------------------------------ divers */
        /* Le compilateur C# de Windows n'embarque pas de manifeste sans rc.exe ; on l'écrit donc
           à côté de l'exe (temp) et on l'active pour la session. Sans lui, l'appli reste valable,
           seulement sans les thèmes Aero. */
        private static void TryActivationContext()
        {
            try
            {
                string f = Path.Combine(Path.GetTempPath(), "qanawa-manifest-" + MyPid() + ".manifest");
                if (!File.Exists(f)) File.WriteAllText(f, Manifest);
                Native.ACTCTX ctx = new Native.ACTCTX();
                ctx.cbSize = (uint)Marshal.SizeOf(typeof(Native.ACTCTX));
                ctx.lpSource = f;
                IntPtr cookie;
                IntPtr h = Native.CreateActCtx(ref ctx);
                if (h != (IntPtr)(-1)) Native.ActivateActCtx(h, out cookie);
            }
            catch { }
        }

        private static string MyPid()
        {
            try { return Process.GetCurrentProcess().Id.ToString(); } catch { return "0"; }
        }

        private const string Manifest =
            "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>" +
            "<assembly xmlns=\"urn:schemas-microsoft-com:asm.v1\" manifestVersion=\"1.0\">" +
            "<trustInfo xmlns=\"urn:schemas-microsoft-com:asm.v3\"><security><requestedPrivileges>" +
            "<requestedExecutionLevel level=\"asInvoker\" uiAccess=\"false\"/>" +
            "</requestedPrivileges></security></trustInfo>" +
            "<dependency><dependentAssembly><assemblyIdentity type=\"win32\" name=\"Microsoft.Windows.Common-Controls\" " +
            "version=\"6.0.0.0\" processorArchitecture=\"*\" publicKeyToken=\"6595b64144ccf1df\" language=\"*\"/>" +
            "</dependentAssembly></dependency></assembly>";

        private static void TryDpiAware()
        {
            try
            {
                Type u = Type.GetType("Qanawa.Native", false);
                if (u == null) return;
                MethodInfo mi = u.GetMethod("SetProcessDpiAwarenessContext");
                if (mi != null) mi.Invoke(null, new object[] { (IntPtr)(-4) });
            }
            catch { }
            try
            {
                // Le manifeste (Qanawa.exe.manifest) déclare déjà PerMonitorV2 ; ce repli couvre
                // les postes où le manifeste n'a pas pu être intégré (build sans QanawaRes.exe).
                Type t = Type.GetType("System.Windows.Forms.Application, System.Windows.Forms", false);
                if (t == null) return;
                t.InvokeMember("SetHighDpiMode", BindingFlags.InvokeMethod | BindingFlags.Public | BindingFlags.Static,
                               null, null, new object[] { 1 });
            }
            catch { }
            try { Native.SetProcessDPIAware(); } catch { }   // repli Vista/7
        }

        private static int ParseInt(string s, int def)
        {
            int v;
            return int.TryParse(s, out v) && v > 1024 && v < 65535 ? v : def;
        }

        private static void Stop()
        {
            _stopping = true;
            try { if (_tray != null) { Type t = _tray.GetType(); t.InvokeMember("Visible", BindingFlags.SetProperty, null, _tray, new object[] { false }); t.InvokeMember("Dispose", BindingFlags.InvokeMethod, null, _tray, null); } } catch { }
            try { if (_listener != null) { _listener.Stop(); _listener.Close(); } } catch { }
        }

        /* Erreur bloquante : on affiche, et on reste affiché (une console qui se referme
           immédiatement = « l'exe lance une page vide » pour l'enseignant). */
        private static void Fatal(string msg, string help)
        {
            Console.WriteLine();
            Console.WriteLine("  ✗ " + msg);
            foreach (string l in help.Split(new string[] { "\n" }, StringSplitOptions.None)) Console.WriteLine("    " + l);
            Console.WriteLine("  (appuyez sur Entrée pour fermer)");
            try { if (Environment.UserInteractive) MessageBox.Show(help + "\n\n" + msg, "Qanawa", MessageBoxButtons.OK, MessageBoxIcon.Error); } catch { }
            try { Console.In.ReadLine(); } catch { }
        }

        private static void Fail(string msg, string help)
        {
            Console.WriteLine("Qanawa: " + msg);
            Console.WriteLine("        " + help);
            try
            {
                if (Environment.UserInteractive)
                    MessageBox.Show(help + "\n\n" + msg, "Qanawa", MessageBoxButtons.OK, MessageBoxIcon.Warning);
            }
            catch { }
            // une fenêtre de console qui se ferme immédiatement ne sert à personne : on attend
            if (!Environment.UserInteractive) { Console.WriteLine("  (appuyez sur Entrée pour fermer)"); try { Console.In.ReadLine(); } catch { } }
        }
    }

    internal static class Native
    {
        [StructLayout(LayoutKind.Sequential, Pack = 1)]
        public struct ACTCTX
        {
            public uint cbSize;
            public uint dwFlags;
            [MarshalAs(UnmanagedType.LPWStr)] public string lpSource;
            public ushort wProcessorArchitecture;
            public ushort wLangId;
            [MarshalAs(UnmanagedType.LPWStr)] public string lpAssemblyDirectory;
            [MarshalAs(UnmanagedType.LPWStr)] public string lpResourceName;
            [MarshalAs(UnmanagedType.LPWStr)] public string lpApplicationName;
            public IntPtr hModule;
        }

        [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
        public static extern IntPtr CreateActCtx(ref ACTCTX actctx);

        [DllImport("kernel32.dll", SetLastError = true)]
        public static extern bool ActivateActCtx(IntPtr hCtx, out IntPtr lpCookie);

        [DllImport("user32.dll")]
        public static extern bool SetProcessDPIAware();

        [DllImport("user32.dll")]
        public static extern bool SetProcessDpiAwarenessContext(IntPtr value);
    }
}
