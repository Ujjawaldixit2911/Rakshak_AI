"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { searchLocation } from "../utils/mapUtils";
import SOSButton from "../components/SOSButton";

// Dynamically import the map to disable SSR (Leaflet requires window)
const DynamicMap = dynamic(() => import("../components/Map"), {
  ssr: false,
  loading: () => <div className="h-[500px] w-full bg-slate-100 animate-pulse rounded-xl flex items-center justify-center text-slate-500">Loading Map...</div>
});

export default function Home() {
  const [startQuery, setStartQuery] = useState("India Gate Delhi");
  const [destQuery, setDestQuery] = useState("Red Fort Delhi");
  
  const [startCoords, setStartCoords] = useState<[number, number]>([28.6129, 77.2295]);
  const [destCoords, setDestCoords] = useState<[number, number]>([28.6562, 77.2410]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSearch = async () => {
    setLoading(true);
    setError("");
    try {
      const startLoc = await searchLocation(startQuery);
      const destLoc = await searchLocation(destQuery);
      
      setStartCoords([startLoc.lat, startLoc.lng]);
      setDestCoords([destLoc.lat, destLoc.lng]);
    } catch (err) {
      setError("Could not find one or both locations. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen p-8 bg-slate-50 font-sans text-slate-800">
      <div className="max-w-5xl mx-auto space-y-8">
        <header>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">
            Rakshak AI
          </h1>
          <p className="text-lg text-slate-500 mt-2">
            Crime-aware safe navigation. Enter your route below.
          </p>
        </header>

        <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Start Location</label>
              <input 
                type="text" 
                value={startQuery}
                onChange={(e) => setStartQuery(e.target.value)}
                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="e.g. India Gate Delhi"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Destination</label>
              <input 
                type="text" 
                value={destQuery}
                onChange={(e) => setDestQuery(e.target.value)}
                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="e.g. Red Fort Delhi"
              />
            </div>
          </div>
          <button 
            onClick={handleSearch}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? "Searching..." : "Find Safe Route"}
          </button>
          {error && <p className="text-red-500 mt-3 text-sm">{error}</p>}
        </section>

        <section className="bg-white p-2 rounded-2xl shadow-lg border border-slate-200">
          <DynamicMap start={startCoords} destination={destCoords} />
        </section>
        
        <SOSButton />
      </div>
    </main>
  );
}
