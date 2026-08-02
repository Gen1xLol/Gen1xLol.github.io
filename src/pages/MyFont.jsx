import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import '../myfont.css'

const demoSections = [
  {
    title: 'what is this',
    body: (
      <p>
        If you take a looksie over to the <Link to="/fontmaker">Draw-A-Font</Link> page, you'll see that it's a utility I designed
	    	to quickly create fonts based off your handwriting. Well, if you can connect two and two together, you'll know that this
	    	is the font I designed with my own utility. Yeah, I know, shameless advertising.
        <br /><br />
        The font is available in two variants: a rough variant, and a smooth variant, which is the default.
        The rough variant is a bit more true to my handwriting (and it was made with pure, unadulterated, <i>greasy</i> mouse movement power), but the smooth variant is a bit more readable.
        I recommend using the smooth variant for body text, and MAYBE the rough variant for headings and titles.
        <br /><br />
        A real weakness I've noticed is that it's very thin, so it sucks when used in small sizes. I recommend using it at around 20px or larger, and if you want to use it smaller than that... tough luck, brochacho.
        <br /><br />
        The font is free to use for personal and commercial projects, but I would appreciate it if you gave me credit for it (I don't expect anyone to use it anyway lol.)
        <br /><br />
        You can do that by linking back to this page, or by mentioning me in your project! :3
        <br />
        It will also be under the MIT license, so you can do almost whatever you want with it.
        <br /><br />
        <a href="/assets/gen1x-rough.ttf" download>Download Rough</a>
        <br />
        <a href="/assets/gen1x-smooth.ttf" download>Download Smooth</a>
      </p>
    ),
  },
  {
    title: 'sample glyphs (smooth)',
    body: (
      <p style={{ fontFamily: 'Gen1x Smooth', fontSize: '30px' }}>
        The quick brown fox jumps over the lazy dog. Pack my box with five dozen liquor jugs.
        Sphinx of black quartz, judge my vow. How vexingly quick daft zebras jump!
        <br />
        <em style={{ color: 'var(--purple-lt)' }}>Aa Bb Cc Dd Ee Ff Gg Hh Ii Jj Kk Ll Mm Nn Oo Pp Qq Rr Ss Tt Uu Vv Ww Xx Yy Zz</em>
        <br />
        <small style={{ color: 'var(--soft)' }}>0123456789 — ¡¿&amp;*#@%()[]{} ÁÉÍÓÚ áéíóú</small>
      </p>
    ),
  },
  {
    title: 'sample glyphs (rough)',
    body: (
      <p style={{ fontFamily: 'Gen1x Rough', fontSize: '30px' }}>
        The quick brown fox jumps over the lazy dog. Pack my box with five dozen liquor jugs.
        Sphinx of black quartz, judge my vow. How vexingly quick daft zebras jump!
        <br />
        <em style={{ color: 'var(--purple-lt)' }}>Aa Bb Cc Dd Ee Ff Gg Hh Ii Jj Kk Ll Mm Nn Oo Pp Qq Rr Ss Tt Uu Vv Ww Xx Yy Zz</em>
        <br />
        <small style={{ color: 'var(--soft)' }}>0123456789 — ¡¿&amp;*#@%()[]{} ÁÉÍÓÚ áéíóú</small>
      </p>
    ),
  },
  {
    title: 'stress tests',
    body: (
      <p style={{ fontSize: '30px' }}>
        <span style={{ fontFamily: 'Gen1x Rough' }}>Stress test for the rough variant</span>
        <img src="/assets/rough_stress.png" style={{ width: '100%' }} />
        <span style={{ fontFamily: 'Gen1x Smooth' }}>Stress test for the smooth variant</span>
        <img src="/assets/smooth_stress.png" style={{ width: '100%' }} />
      </p>
    ),
  },
  {
    title: 'license text',
    body: (
      <div style={{ fontSize: '16px' }}>
        <pre style={{ fontSize: 'inherit', margin: 0 }}>{`Copyright (c) ${new Date().getFullYear()} Gen1x

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`}</pre>
      </div>
    ),
  },
]

export default function MyFont() {
  return (
    <>
      <main>
        <Link to="/" className="back-link"><ArrowLeft size={16} /> go back</Link>
        <div className="intro">
          <p className="intro-label">i present to you...</p>
          <h1>The Gen1x Font</h1>
          <div>
            <p className="prev">(because everyone totally needs it)</p>
          </div>
        </div>

        {demoSections.map((section, i) => [
          <div className="section" key={section.title}>
            <p className="section-title">{section.title}</p>
            {section.body}
          </div>
        ])}
      </main>

      <footer style={{ maxWidth: '680px', marginLeft: 'auto', marginRight: 'auto', paddingLeft: '28px', paddingRight: '28px' }}>
        <span>gen1x</span>
        <span>{new Date().getFullYear()}</span>
      </footer>
    </>
  )
}
