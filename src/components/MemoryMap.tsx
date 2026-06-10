import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, Plus, ArrowLeft, Heart, X, Trash2 } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, addDoc, onSnapshot, query, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';

export default function MemoryMap({ onBack }: { onBack: () => void }) {
  const [pins, setPins] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newPin, setNewPin] = useState({ title: '', lat: '33.3152', lng: '44.3661' }); // Default Baghdad

  useEffect(() => {
    const q = query(collection(db, 'memoryPins'));
    return onSnapshot(q, (snapshot) => {
      setPins(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  }, []);

  const addPin = async () => {
    if (!newPin.title) return;
    await addDoc(collection(db, 'memoryPins'), {
      ...newPin,
      createdAt: serverTimestamp()
    });
    setShowAdd(false);
    setNewPin({ title: '', lat: '33.3152', lng: '44.3661' });
  };

  const deletePin = async (id: string) => {
    await deleteDoc(doc(db, 'memoryPins', id));
  };

  return (
    <div className="fixed inset-0 z-[100] bg-[#111] flex flex-col font-sans">
      <div className="p-4 border-b border-white/5 flex items-center justify-between bg-black/40">
        <button onClick={onBack} className="p-2 bg-white/5 rounded-full"><ArrowLeft /></button>
        <h2 className="text-lg font-bold">خريطة ذكرياتنا 📍</h2>
        <button onClick={() => setShowAdd(true)} className="p-2 bg-rose-500 rounded-full"><Plus size={20} /></button>
      </div>

      <div className="flex-1 relative">
        <iframe 
          title="Memory Map"
          width="100%" 
          height="100%" 
          className="grayscale invert contrast-125 opacity-80"
          src={`https://www.openstreetmap.org/export/embed.html?bbox=44.0,33.0,45.0,34.0&layer=mapnik&marker=${pins[0]?.lat || 33.3152},${pins[0]?.lng || 44.3661}`}
        />

        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute bottom-6 left-6 right-6 flex gap-4 overflow-x-auto pb-4 px-2 snap-x pointer-events-auto">
            {pins.map(pin => (
              <motion.div 
                key={pin.id}
                whileHover={{ scale: 1.05 }}
                className="snap-center shrink-0 w-64 bg-black/80 backdrop-blur-xl border border-white/10 p-4 rounded-3xl flex items-center gap-4 relative group"
              >
                <div className="w-12 h-12 bg-rose-500/20 rounded-2xl flex items-center justify-center">
                  <MapPin className="text-rose-500" />
                </div>
                <div>
                  <h4 className="text-white font-bold text-sm">{pin.title}</h4>
                  <p className="text-[10px] text-white/40">{pin.lat}, {pin.lng}</p>
                </div>
                <button onClick={() => deletePin(pin.id)} className="absolute -top-2 -right-2 p-1.5 bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                  <X size={12} />
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showAdd && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAdd(false)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-[#1a1a1a] w-full max-w-sm rounded-[2.5rem] border border-white/10 p-8">
              <h3 className="text-xl font-bold mb-6 text-center">أضف مكاناً لن ننساه</h3>
              <div className="space-y-4">
                <input 
                  value={newPin.title}
                  onChange={e => setNewPin({...newPin, title: e.target.value})}
                  placeholder="اسم المكان (مثلاً: أول لقاء)"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white"
                />
                <div className="grid grid-cols-2 gap-4">
                  <input 
                    value={newPin.lat}
                    onChange={e => setNewPin({...newPin, lat: e.target.value})}
                    placeholder="Latitude"
                    className="bg-white/5 border border-white/10 rounded-2xl p-4 text-xs text-white"
                  />
                  <input 
                    value={newPin.lng}
                    onChange={e => setNewPin({...newPin, lng: e.target.value})}
                    placeholder="Longitude"
                    className="bg-white/5 border border-white/10 rounded-2xl p-4 text-xs text-white"
                  />
                </div>
                <button onClick={addPin} className="w-full py-4 bg-rose-500 rounded-2xl font-bold mt-4 shadow-lg shadow-rose-500/20">حفظ الذكرى</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
