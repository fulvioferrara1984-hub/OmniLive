const fs = require('fs');
const content = fs.readFileSync('src/components/Dashboard.tsx', 'utf-8');
const lines = content.split('\n');

const newBlock = `                </div>
              ))}
            </div>

            {/* Total Hardware Summary */}
            <div className="bg-slate-900 text-white p-4 rounded-xl flex items-center justify-between shadow-lg mt-8 mb-8">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-lg">
                  <LayoutGrid className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <span className="text-sm font-bold uppercase tracking-widest block">Total Hardware Units</span>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider">Across all galleries</span>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <p className="text-[10px] text-slate-400 uppercase font-bold">Main</p>
                  <p className="text-xl font-black text-white">
                    {formData.galleries.reduce((acc, g) => acc + g.mainConfig.cameras + g.mainConfig.pgms + g.mainConfig.outputs, 0)}
                  </p>
                </div>
                {formData.galleries.some(g => g.hasBackup) && (
                  <div className="text-center border-l border-white/10 pl-6">
                    <p className="text-[10px] text-blue-400 uppercase font-bold">Backup</p>
                    <p className="text-xl font-black text-blue-400">
                      {formData.galleries.reduce((acc, g) => acc + (g.hasBackup && g.backupConfig ? g.backupConfig.cameras + g.backupConfig.pgms + g.backupConfig.outputs : 0), 0)}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* SECOND MAP: Virtual Assets and Layout Preview */}
            <div className="space-y-12">
              {formData.galleries.map((gallery, gIndex) => (
                <div key={\`\${gallery.id}-assets\`} className="space-y-6">
                  {formData.galleries.length > 1 && (
                    <div className="flex items-center gap-2 mb-4">
                      <div className="h-px flex-1 bg-slate-100"></div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] px-3 py-1 bg-white rounded-full border border-slate-100 shadow-sm">
                        {gallery.name} - Assets
                      </span>
                      <div className="h-px flex-1 bg-slate-100"></div>
                    </div>
                  )}

                  <div className="space-y-6 pt-4 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                      <Box className="w-4 h-4 text-blue-500" />
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Virtual Assets</label>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {[
                        'LED', 
                        'LED-Domination', 
                        'LED-Jumbo', 
                        'Carpets', 
                        'Carpets on Carpets', 
                        'Center Circle',
                        'Additional',
                        'Static Board'
                      ].map((asset) => {
                        const isActive = gallery.virtualAssets?.includes(asset);
                        return (
                          <button
                            key={asset}
                            type="button"
                            onClick={() => {
                              const newGalleries = [...formData.galleries];
                              const currentAssets = newGalleries[gIndex].virtualAssets || [];
                              if (isActive) {
                                newGalleries[gIndex] = {
                                  ...newGalleries[gIndex],
                                  virtualAssets: currentAssets.filter(a => a !== asset)
                                };
                              } else {
                                newGalleries[gIndex] = {
                                  ...newGalleries[gIndex],
                                  virtualAssets: [...currentAssets, asset]
                                };
                              }
                              setFormData({ ...formData, galleries: newGalleries });
                            }}
                            className={cn(
                              "px-3 py-1.5 rounded-lg text-xs font-bold transition-all border",
                              isActive 
                                ? "bg-blue-600 border-blue-600 text-white shadow-sm" 
                                : "bg-white border-slate-200 text-slate-600 hover:border-blue-300 hover:bg-blue-50"
                            )}
                          >
                            {asset}
                          </button>
                        );
                      })}

                      {/* Custom Assets */}
                      {gallery.virtualAssets?.filter(a => ![
                        'LED', 'LED-Domination', 'LED-Jumbo', 'Carpets', 'Carpets on Carpets', 'Center Circle', 'Additional', 'Static Board'
                      ].includes(a)).map((asset) => (
                        <button
                          key={asset}
                          type="button"
                          onClick={() => {
                            const newGalleries = [...formData.galleries];
                            const currentAssets = newGalleries[gIndex].virtualAssets || [];
                            newGalleries[gIndex] = {
                              ...newGalleries[gIndex],
                              virtualAssets: currentAssets.filter(a => a !== asset)
                            };
                            setFormData({ ...formData, galleries: newGalleries });
                          }}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all border bg-blue-600 border-blue-600 text-white shadow-sm flex items-center gap-2"
                        >
                          {asset}
                          <Minus className="w-3 h-3" />
                        </button>
                      ))}

                      {/* Add Button */}
                      {addingAssetToGallery === gallery.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            autoFocus
                            type="text"
                            value={newAssetValue}
                            onChange={(e) => setNewAssetValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                if (newAssetValue.trim()) {
                                  const newGalleries = [...formData.galleries];
                                  const currentAssets = newGalleries[gIndex].virtualAssets || [];
                                  if (!currentAssets.includes(newAssetValue.trim())) {
                                    newGalleries[gIndex] = {
                                      ...newGalleries[gIndex],
                                      virtualAssets: [...currentAssets, newAssetValue.trim()]
                                    };
                                    setFormData({ ...formData, galleries: newGalleries });
                                  }
                                  setNewAssetValue('');
                                  setAddingAssetToGallery(null);
                                }
                              } else if (e.key === 'Escape') {
                                setAddingAssetToGallery(null);
                                setNewAssetValue('');
                              }
                            }}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium border border-blue-300 outline-none focus:ring-2 focus:ring-blue-500 w-32"
                            placeholder="Asset name..."
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (newAssetValue.trim()) {
                                const newGalleries = [...formData.galleries];
                                const currentAssets = newGalleries[gIndex].virtualAssets || [];
                                if (!currentAssets.includes(newAssetValue.trim())) {
                                  newGalleries[gIndex] = {
                                    ...newGalleries[gIndex],
                                    virtualAssets: [...currentAssets, newAssetValue.trim()]
                                  };
                                  setFormData({ ...formData, galleries: newGalleries });
                                }
                                setNewAssetValue('');
                                setAddingAssetToGallery(null);
                              }
                            }}
                            className="p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setAddingAssetToGallery(gallery.id)}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all border border-dashed border-slate-300 text-slate-400 hover:border-blue-400 hover:text-blue-500 flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" />
                          ADD
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Layout Preview Section */}
                  <div className="space-y-4 pt-6 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ImageIcon className="w-4 h-4 text-blue-500" />
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Layout Preview / Disposition</label>
                      </div>
                      {gallery.layoutPreview && (
                        <button
                          type="button"
                          onClick={() => {
                            const newGalleries = [...formData.galleries];
                            newGalleries[gIndex] = { ...newGalleries[gIndex], layoutPreview: '' };
                            setFormData({ ...formData, galleries: newGalleries });
                          }}
                          className="text-[10px] font-bold text-red-500 hover:text-red-700 flex items-center gap-1"
                        >
                          <X className="w-3 h-3" />
                          Remove
                        </button>
                      )}
                    </div>

                    {gallery.layoutPreview ? (
                      <div className="relative group rounded-xl overflow-hidden border border-slate-200 bg-slate-50 aspect-video">
                        <img 
                          src={gallery.layoutPreview} 
                          alt="Layout Preview" 
                          className="w-full h-full object-contain"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <label className="cursor-pointer bg-white px-4 py-2 rounded-lg text-xs font-bold text-slate-900 shadow-lg flex items-center gap-2 hover:bg-slate-50 transition-colors">
                            <Upload className="w-4 h-4" />
                            Change Image
                            <input 
                              type="file" 
                              accept="image/*" 
                              className="hidden" 
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  if (file.size > 1024 * 1024) {
                                    alert("Image too large. Please upload an image smaller than 1MB.");
                                    return;
                                  }
                                  const base64 = await fileToBase64(file);
                                  const newGalleries = [...formData.galleries];
                                  newGalleries[gIndex] = { ...newGalleries[gIndex], layoutPreview: base64 };
                                  setFormData({ ...formData, galleries: newGalleries });
                                }
                              }}
                            />
                          </label>
                        </div>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-200 rounded-xl hover:bg-slate-50 hover:border-blue-300 transition-all cursor-pointer group">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <Upload className="w-8 h-8 text-slate-300 group-hover:text-blue-400 mb-2 transition-colors" />
                          <p className="text-xs font-bold text-slate-400 group-hover:text-blue-500 transition-colors uppercase tracking-widest">Upload Layout Preview</p>
                          <p className="text-[10px] text-slate-400 mt-1">PNG, JPG up to 1MB</p>
                        </div>
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              if (file.size > 1024 * 1024) {
                                alert("Image too large. Please upload an image smaller than 1MB.");
                                return;
                              }
                              const base64 = await fileToBase64(file);
                              const newGalleries = [...formData.galleries];
                              newGalleries[gIndex] = { ...newGalleries[gIndex], layoutPreview: base64 };
                              setFormData({ ...formData, galleries: newGalleries });
                            }
                          }}
                        />
                      </label>
                    )}
                  </div>
                </div>
              ))}
            </div>`;

// Replace lines 2048 to 2314
const head = lines.slice(0, 2047);
const tail = lines.slice(2314);

fs.writeFileSync('src/components/Dashboard.tsx', head.join('\n') + '\n' + newBlock + '\n' + tail.join('\n'));
console.log('Fixed perfectly!');
