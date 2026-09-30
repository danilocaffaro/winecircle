"""Rebuild the checked-in icon subset: pip install fonttools==4.62.1 brotli."""
from pathlib import Path
import json, re
from fontTools.ttLib import TTFont
from fontTools import subset
from fontTools.varLib.instancer import instantiateVariableFont
root = Path(__file__).resolve().parent.parent
font = TTFont(root / 'app/resources/material-symbols-rounded.woff2')
tokens = set()
for path in (root / 'app/src').rglob('*'):
    if path.suffix in ['.ts', '.tsx']:
        tokens.update(re.findall(r'\b[a-z][a-z0-9_]*\b', path.read_text()))
# Some ligature names are aliases (emoji_events -> trophy, for example).
characters = {glyph: chr(code) for code, glyph in font.getBestCmap().items() if 32 <= code < 127}
ligatures = {}
for lookup in font['GSUB'].table.LookupList.Lookup:
    for table in lookup.SubTable:
        table = getattr(table, 'ExtSubTable', table)
        for first, values in getattr(table, 'ligatures', {}).items():
            for value in values:
                name = ''.join(characters.get(glyph, '?') for glyph in [first] + value.Component)
                ligatures[name] = value.LigGlyph
icons = sorted(tokens.intersection(ligatures))
font = instantiateVariableFont(font, {'opsz': 24, 'GRAD': 0}, inplace=True)
# The source omits empty variation entries for its ligature input glyphs.
if 'gvar' in font:
    for glyph in font.getGlyphOrder():
        font['gvar'].variations.setdefault(glyph, [])
options = subset.Options()
options.layout_closure = False
# Material Symbols uses required ligatures (rlig), not standard liga.
options.layout_features = ['*']
options.glyph_names = True
subsetter = subset.Subsetter(options=options)
subsetter.populate(glyphs=[ligatures[name] for name in icons], text=''.join(icons))
subsetter.subset(font)
font.flavor = 'woff2'
output = root / 'app/public/fonts/material-symbols-rounded-subset.woff2'
font.save(output)
(root / 'app/resources/icon-subset.json').write_text(json.dumps(icons, indent=2) + '\n')
print(f'{len(icons)} icons, {output.stat().st_size} bytes')
