'use client';

const TestBackground = () => {
  return (
    <div className="w-full h-full relative overflow-hidden">
      {/* Fondo base muy visible */}
      <div className="absolute inset-0 bg-gradient-to-r from-red-500 to-blue-500 opacity-50" />
      
      {/* Círculo rotante súper visible */}
      <div className="absolute inset-0">
        <div className="absolute top-10 left-10 w-20 h-20 bg-yellow-400 rounded-full animate-spin" />
      </div>
      
      {/* Texto de debug */}
      <div className="absolute top-4 right-4 text-white bg-black p-2 rounded">
        BACKGROUND CARGADO ✅
      </div>
    </div>
  );
};

export default TestBackground;
