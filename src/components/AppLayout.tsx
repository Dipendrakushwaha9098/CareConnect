import React from "react";

const AppLayout = ({ children }: { children: React.ReactNode }) => {
     return (
          <div className="min-h-screen flex">
               {/* Sidebar */}
               <aside className="w-64 bg-gray-900 text-white p-4">
                    <h2 className="text-xl font-bold">Vedacare</h2>
               </aside>

               {/* Main Content */}
               <main className="flex-1 p-6 bg-gray-100 overflow-y-auto">
                    {children}
               </main>
          </div>
     );
};

export default AppLayout;
