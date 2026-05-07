const fs = require('fs');
const content = fs.readFileSync('src/components/Dashboard.tsx', 'utf-8');
const lines = content.split('\n');

// The first loop starts around 1618: <div className="space-y-12">
// Inside it, we have:
//               {formData.galleries.map((gallery, gIndex) => (
//                 <div key={gallery.id} className="space-y-6 relative">...

// The virtual assets part starts near line 2148:
//                     <div className="space-y-6 pt-4 border-t border-slate-100">
//                       <div className="flex items-center gap-2">
//                         <Box className="w-4 h-4 text-blue-500" />
//                         <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Virtual Assets</label>

// Let's identify the lines.
const blockStart = lines.findIndex(line => line.includes('<label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Virtual Assets</label>'));
// It starts at the wrapper `<div className="space-y-6 pt-4 border-t border-slate-100">`
let virtualAssetsStart = blockStart;
while (!lines[virtualAssetsStart].includes('<div className="space-y-6 pt-4 border-t border-slate-100">')) {
  virtualAssetsStart--;
}

// It goes until the end of the map.
// The layout preview ends at:
//                         </label>
//                       )}
//                     </div>
//                 </div>
//               ))}
let endMapIdx = virtualAssetsStart;
while (!lines[endMapIdx].includes('))}')) {
    endMapIdx++;
}

// So lines[virtualAssetsStart] up to lines[endMapIdx - 2] is the inner stuff we want to move!
// wait, line endMapIdx - 1 is                 </div>
// line endMapIdx is               ))}

console.log("Virtual assets starts at:", virtualAssetsStart);
console.log("End map is at:", endMapIdx);

const innerContent = lines.slice(virtualAssetsStart, endMapIdx - 1).join('\n');

// We need to cut this from the first loop.
// So the first loop will close at `virtualAssetsStart - 1` by adding `</div>))} </div>`
// Let's find Total Hardware Summary
const totalHardwareSummaryStart = lines.findIndex(line => line.includes('{/* Total Hardware Summary */}'));

// Total Hardware Summary ends when External Links Section starts
const externalLinksStart = lines.findIndex(line => line.includes('{/* External Links Section */}'));

console.log("Total hardware summary starts at:", totalHardwareSummaryStart);
console.log("External links starts at:", externalLinksStart);

const totalHardwareContent = lines.slice(totalHardwareSummaryStart, externalLinksStart).join('\n');

// The new flow should be:
// First Loop (without virtual assets)
// Total Hardware Content
// Second Loop (only virtual assets)

// To build Second Loop:
const secondLoopHeader = `<div className="space-y-12">
              {formData.galleries.map((gallery, gIndex) => (
                <div key={gallery.id} className="space-y-6">
                  {formData.galleries.length > 1 && (
                    <div className="flex items-center gap-2 mb-4">
                      <div className="h-px flex-1 bg-slate-100"></div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-3 py-1 bg-slate-50 rounded-full border border-slate-100">
                        {gallery.name}
                      </span>
                      <div className="h-px flex-1 bg-slate-100"></div>
                    </div>
                  )}`;

const secondLoopFooter = `                </div>
              ))}
            </div>`;

const secondLoopComplete = secondLoopHeader + '\n' + innerContent + '\n' + secondLoopFooter;

// So we replace the original text parts:
// We'll leave the first loop as is, EXCEPT removing innerContent.
// The first loop ends at endMapIdx. We just delete innerContent.

// Then, we need `Total Hardware Content`. It's already right after the first loop.
// Wait, currently it's:
// FIRST LOOP (with innerContent)
// Total Hardware Content
// External Links

// We want:
// FIRST LOOP (without innerContent)
// Total Hardware Content
// SECOND LOOP (with innerContent)
// External Links

// Actually, this is very easy!
// 1. Remove innerContent from where it is.
// 2. Insert SECOND LOOP right BEFORE External Links!

let newLines = [...lines];

// Step 1: Blank out the innerContent
for (let i = virtualAssetsStart; i < endMapIdx - 1; i++) {
  newLines[i] = ''; // clear it to preserve line numbers for the next steps
}

// Step 2: we need to place the SECOND LOOP just before External Links
newLines.splice(externalLinksStart, 0, secondLoopComplete, '\n');

fs.writeFileSync('src/components/Dashboard.tsx', newLines.filter(line => line !== '').join('\n'));
console.log("Done refactoring loops!");
