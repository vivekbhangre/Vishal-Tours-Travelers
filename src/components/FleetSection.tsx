import React from 'react';
import { motion } from 'motion/react';
import { Users, Briefcase, Car } from 'lucide-react';
import ScrollReveal from './ScrollReveal';

const fleet = [
  {
    id: 'dzire',
    name: 'Maruti Suzuki Dzire',
    type: 'Comfort Sedan',
    description: 'Perfect for small families or business trips with premium comfort and smooth rides.',
    passengers: '4 Seats',
    luggage: '2 Bags',
    image: 'https://i.pinimg.com/736x/8f/06/8b/8f068b17e5e98c9596be2499b5df738c.jpg',
    color: 'from-blue-500 to-indigo-600',
    darkColor: 'dark:from-blue-900 dark:to-indigo-950',
  },
  {
    id: 'ertiga',
    name: 'Maruti Suzuki Ertiga',
    type: 'Spacious MUV',
    description: 'Ideal for group outings and family vacations. Offers extra space without compromising comfort.',
    passengers: '7 Seats',
    luggage: '4 Bags',
    image: 'https://i.pinimg.com/736x/89/32/c0/8932c0e6bacc17f73c4d64aa6aa4ff5b.jpg',
    color: 'from-emerald-500 to-teal-600',
    darkColor: 'dark:from-emerald-900 dark:to-teal-950',
  },
  {
    id: 'traveler',
    name: 'Force Traveler',
    type: 'Premium Minibus',
    description: 'The ultimate choice for large groups, tours, and extended trips requiring maximum space and comfort.',
    passengers: '17 Seats',
    luggage: '6+ Bags',
    image: 'https://i.pinimg.com/736x/fe/22/ce/fe22ce132a8f19f0c57b48b5160c7bb3.jpg',
    color: 'from-orange-400 to-red-500',
    darkColor: 'dark:from-orange-900 dark:to-red-950',
  }
];

export default function FleetSection() {
  return (
    <div className="py-16 sm:py-24 bg-transparent transition-colors duration-500 relative z-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollReveal>
          <div className="text-center md:text-left mb-12">
            <h2 className="text-sm text-indigo-600 dark:text-indigo-500 font-bold tracking-widest uppercase mb-3">Our Premium Fleet</h2>
            <p className="text-3xl leading-tight font-extrabold text-gray-900 sm:text-4xl transition-colors duration-500">
              Vehicles for Every Need
            </p>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-stretch">
          {fleet.map((vehicle, index) => (
            <div key={vehicle.id} className="flex flex-col h-full">
              <ScrollReveal delay={index * 0.1} className="flex-1 flex flex-col w-full h-full block">
                <motion.div
                whileHover={{ y: -5 }}
                className={`relative flex-1 w-full rounded-3xl overflow-hidden group shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] border border-gray-200 dark:border-white/10 bg-transparent transition-all duration-500 h-full flex flex-col`}
              >
                {/* Image Section */}
                <div className="relative h-64 overflow-hidden bg-white dark:bg-gray-200 flex items-center justify-center border-b border-gray-200/50 dark:border-white/10 z-10">
                  <img 
                    src={vehicle.image} 
                    alt={vehicle.name}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    className="absolute inset-0 w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700 z-0" 
                  />
                  <div className="absolute bottom-4 left-6 z-20">
                    <span className="px-3 py-1 bg-gray-900/80 dark:bg-black/70 backdrop-blur-md rounded-full text-white text-xs font-semibold uppercase tracking-wider shadow-sm">
                      {vehicle.type}
                    </span>
                  </div>
                </div>

                {/* Content Section */}
                <div className="p-6 flex-grow flex flex-col bg-white/60 dark:bg-[#0a0f12]/60 backdrop-blur-xl relative z-0">
                  <h3 className="text-2xl font-bold text-gray-900 mb-3 transition-colors duration-500">{vehicle.name}</h3>
                  <p className="text-gray-600 text-sm mb-6 flex-grow transition-colors duration-500">
                    {vehicle.description}
                  </p>

                  {/* Attributes */}
                  <div className="grid grid-cols-2 gap-4 mt-auto">
                    <div className="flex items-center space-x-3 p-3 rounded-2xl bg-white/50 dark:bg-white/5 border border-white/40 dark:border-white/10 transition-colors duration-500 shadow-sm">
                      <div className={`p-2 rounded-xl bg-gradient-to-br ${vehicle.color} text-[#ffffff]`}>
                        <Users className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wide">Capacity</p>
                        <p className="text-xs sm:text-sm font-semibold text-gray-900">{vehicle.passengers}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3 p-3 rounded-2xl bg-white/50 dark:bg-white/5 border border-white/40 dark:border-white/10 transition-colors duration-500 shadow-sm">
                      <div className={`p-2 rounded-xl bg-gradient-to-br ${vehicle.color} text-[#ffffff]`}>
                        <Briefcase className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wide">Luggage</p>
                        <p className="text-xs sm:text-sm font-semibold text-gray-900">{vehicle.luggage}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
              </ScrollReveal>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
