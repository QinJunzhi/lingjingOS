
import React, { useContext, useEffect, useState, useRef } from 'react';
import { GlobalContext, ThemeContext } from '../constants';

export const SystemStatus: React.FC = () => {
  const { weather, setWeather, mood, setMood, setIsCalendarOpen, isCalendarOpen, addCalendarBlock } = useContext(GlobalContext) as any;
  const { theme } = useContext(ThemeContext);
  const [time, setTime] = useState(new Date());
  const [showMoodSelector, setShowMoodSelector] = useState(false);
  const moodRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (moodRef.current && !moodRef.current.contains(event.target as Node)) {
        setShowMoodSelector(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Real-time Weather Fetching
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const response = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`
          );
          const data = await response.json();
          
          if (data.current_weather) {
            const code = data.current_weather.weathercode;
            let weatherType: any = 'sunny';
            let icon = 'fa-sun';

            if (code <= 1) { weatherType = 'sunny'; icon = 'fa-sun'; }
            else if (code <= 3) { weatherType = 'cloudy'; icon = 'fa-cloud'; }
            else if (code <= 48) { weatherType = 'foggy'; icon = 'fa-smog'; }
            else if (code <= 67) { weatherType = 'rainy'; icon = 'fa-cloud-rain'; }
            else if (code <= 77) { weatherType = 'snow'; icon = 'fa-snowflake'; }
            else if (code <= 82) { weatherType = 'rainy'; icon = 'fa-cloud-showers-heavy'; }
            else if (code <= 99) { weatherType = 'storm'; icon = 'fa-bolt'; }

            setWeather({
              type: weatherType,
              temp: Math.round(data.current_weather.temperature),
              icon: icon
            });
          }
        } catch (error) {
          console.error("Weather fetch failed", error);
        }
      }, (error) => {
        console.warn("Location permission denied", error);
      });
    }
  }, []);

  const moodOptions = ['🤩', '🙂', '😐', '😫', '😡', '🤯', '😴', '🧐', '🥳', '😎', '😭', '👻'];

  const toggleMood = (emoji: string) => {
      // Split current mood into array, defaulting to empty if it's the initial string
      const parts = [...mood].filter(c => moodOptions.includes(c)); // Basic filter
      
      let newMoodStr = emoji;
      if (parts.includes(emoji)) {
          const newMoods = parts.filter(m => m !== emoji);
          newMoodStr = newMoods.length > 0 ? newMoods.join('') : '😐';
      } else {
          // If the only current mood is the default 'Neutral' and we click something else, replace it.
          // Otherwise append.
          if (parts.length === 1 && parts[0] === '😐') {
              newMoodStr = emoji;
          } else {
              newMoodStr = parts.join('') + emoji;
          }
      }
      setMood(newMoodStr);

      // INSTANTLY ADD TO CALENDAR
      const currentHourStr = new Date().getHours().toString().padStart(2, '0') + ":00";
      addCalendarBlock({
          id: `instant_mood_${Date.now()}`,
          title: `心情切换: ${emoji}`,
          duration: 15,
          type: 'mood',
          assignedTime: currentHourStr
      });
  };

  return (
    <div className="relative flex items-center gap-3 text-xs font-mono select-none bg-white/60 dark:bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-gray-200 dark:border-gray-700 shadow-sm z-50">
      
      {/* Time & Weather Trigger Calendar */}
      <div 
        className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
        onClick={() => setIsCalendarOpen(!isCalendarOpen)}
        title="点击打开/关闭学习日历"
      >
          {/* Time */}
          <div className={`flex items-center gap-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
            <span>{time.getHours().toString().padStart(2,'0')}:{time.getMinutes().toString().padStart(2,'0')}</span>
          </div>

          <div className="w-px h-3 bg-gray-300 dark:bg-gray-600"></div>

          {/* Weather */}
          <div className="flex items-center gap-1 text-blue-500">
            <i className={`fas ${weather.icon}`}></i>
            <span>{weather.temp}°C</span>
          </div>

          <div className="w-px h-3 bg-gray-300 dark:bg-gray-600"></div>
      </div>

      {/* Mood Selector */}
      <div className="relative" ref={moodRef}>
          <div 
            className="text-base hover:scale-110 transition-transform active:scale-90 cursor-pointer"
            onClick={() => setShowMoodSelector(!showMoodSelector)}
            title="点击切换心情"
          >
            {mood}
          </div>
          
          {showMoodSelector && (
              <div className="absolute top-full right-0 mt-3 p-2 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 grid grid-cols-4 gap-2 w-48 animate-[fadeIn_0.2s]">
                  {moodOptions.map(m => (
                      <button 
                        key={m}
                        onClick={() => toggleMood(m)}
                        className={`text-xl p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${mood.includes(m) ? 'bg-purple-100 dark:bg-purple-900/50' : ''}`}
                      >
                          {m}
                      </button>
                  ))}
              </div>
          )}
      </div>
      
      <i 
        className={`fas fa-chevron-${isCalendarOpen ? 'up' : 'down'} text-[10px] opacity-50 ml-1 cursor-pointer`}
        onClick={() => setIsCalendarOpen(!isCalendarOpen)}
      ></i>
    </div>
  );
};
