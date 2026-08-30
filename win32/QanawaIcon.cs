/* ============================================================================
   QanawaIcon — fabrique Qanawa.ico (icône de l'application Windows)
   ----------------------------------------------------------------------------
   Lancé par build_exe.bat après la compilation :
       csc /target:exe QanawaIcon.cs  puis  QanawaIcon.exe Qanawa.ico
   L'icône est un PNG 128×128 encapsulé dans un conteneur ICO (format autorisé
   par Windows Vista et suivants) : aucune ressource binaire n'est à stocker
   dans le dépôt, tout est dessiné ici.
   Si System.Drawing échoue (poste sans GDI), on sort 0 sans bloquer le build.
   ========================================================================== */
using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Text;
using System.IO;

internal static class QanawaIcon
{
    private const int Size = 128;

    [STAThread]
    private static int Main(string[] args)
    {
        string outPath = args.Length > 0 ? args[0] : "Qanawa.ico";
        try
        {
            byte[] png = Draw();
            File.WriteAllBytes(outPath, Wrap(png));
            Console.WriteLine("  icône écrite : " + Path.GetFullPath(outPath) + " (" + png.Length + " o de PNG)");
            return 0;
        }
        catch (Exception e)
        {
            Console.WriteLine("  icône impossible (" + e.GetType().Name + ") — Windows utilisera l'icône par défaut.");
            return 0;   // jamais bloquant pour le build
        }
    }

    private static byte[] Draw()
    {
        using (Bitmap bmp = new Bitmap(Size, Size))
        using (Graphics g = Graphics.FromImage(bmp))
        {
            g.SmoothingMode = SmoothingMode.AntiAlias;
            g.TextRenderingHint = TextRenderingHint.AntiAliasGridFit;
            g.Clear(Color.Transparent);

            using (GraphicsPath p = Round(new Rectangle(6, 6, Size - 12, Size - 12), 26))
            using (SolidBrush bg = new SolidBrush(Color.FromArgb(27, 79, 140)))   // --ink du prototype
            {
                g.FillPath(bg, p);
                using (Pen sun = new Pen(Color.FromArgb(246, 198, 75), 5f)) g.DrawPath(sun, p);   // --sun
            }

            using (SolidBrush teal = new SolidBrush(Color.FromArgb(23, 176, 160)))   // --teal : la vague « قَنَوة »
            using (GraphicsPath wave = new GraphicsPath())
            {
                wave.AddBezier(20, 96, 44, 76, 84, 112, 108, 88);
                wave.AddLine(108, 88, 108, 104);
                wave.AddBezier(108, 104, 84, 126, 44, 92, 20, 112);
                wave.CloseFigure();
                g.FillPath(teal, wave);
            }

            Font f = Pick(g, 62);
            using (SolidBrush ink = new SolidBrush(Color.White))
            using (StringFormat sf = new StringFormat())
            {
                sf.Alignment = StringAlignment.Center;
                sf.LineAlignment = StringAlignment.Center;
                g.DrawString("Q", f, ink, new RectangleF(0, 6, Size, Size - 22), sf);
            }
            f.Dispose();

            using (MemoryStream ms = new MemoryStream())
            {
                bmp.Save(ms, System.Drawing.Imaging.ImageFormat.Png);
                return ms.ToArray();
            }
        }
    }

    private static Font Pick(Graphics g, float size)
    {
        string[] prefs = new string[] { "Segoe UI Black", "Segoe UI", "Arial Black", "Tahoma" };
        for (int i = 0; i < prefs.Length; i++)
        {
            try
            {
                FontFamily ff = new FontFamily(prefs[i]);
                return new Font(ff, size, FontStyle.Bold, GraphicsUnit.Pixel);
            }
            catch { }
        }
        return new Font(FontFamily.GenericSansSerif, size, FontStyle.Bold, GraphicsUnit.Pixel);
    }

    private static GraphicsPath Round(Rectangle r, int radius)
    {
        int d = radius * 2;
        GraphicsPath p = new GraphicsPath();
        p.AddArc(r.X, r.Y, d, d, 180, 90);
        p.AddArc(r.Right - d, r.Y, d, d, 270, 90);
        p.AddArc(r.Right - d, r.Bottom - d, d, d, 0, 90);
        p.AddArc(r.X, r.Bottom - d, d, d, 90, 90);
        p.CloseFigure();
        return p;
    }

    /* ICO = en-tête 6 o + une entrée de répertoire 16 o + le PNG tel quel. */
    private static byte[] Wrap(byte[] png)
    {
        using (MemoryStream ms = new MemoryStream())
        using (BinaryWriter w = new BinaryWriter(ms))
        {
            w.Write((ushort)0);              // réservé
            w.Write((ushort)1);              // type : icône
            w.Write((ushort)1);              // une image
            w.Write((byte)(Size >= 256 ? 0 : Size));
            w.Write((byte)(Size >= 256 ? 0 : Size));
            w.Write((byte)0);                // palette
            w.Write((byte)0);                // réservé
            w.Write((ushort)1);              // plans
            w.Write((ushort)32);             // bits/pixel
            w.Write(png.Length);             // taille des données
            w.Write(22);                     // décalage des données
            w.Write(png);
            w.Flush();
            return ms.ToArray();
        }
    }
}
