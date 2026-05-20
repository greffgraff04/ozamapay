'use client';
import { useEffect, useState } from 'react';

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    fetch('http://192.168.1.116:3001/wallet/all')
      .then(res => res.json())
      .then(data => setUsers(data))
      .catch(err => console.error(err));
  }, []);

  return (
    <div className="p-10">
      <div className="flex justify-between items-center mb-10">
        <h1 className="text-4xl font-black italic">UTILISATEURS</h1>
        <span className="bg-gray-100 px-4 py-2 rounded-full font-bold text-xs">{users.length} TOTAL</span>
      </div>

      <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-gray-100">
        {users.length === 0 ? (
          <p className="text-center text-gray-400 italic">Chajman done yo...</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="text-gray-400 text-[10px] uppercase tracking-widest border-b">
                <th className="pb-4 text-left">Membre</th>
                <th className="pb-4 text-left">Solde</th>
                <th className="pb-4 text-left">État</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u: any) => (
                <tr key={u.id} className="border-b last:border-0">
                  <td className="py-6 font-bold">{u.email}</td>
                  <td className="py-6 font-mono text-green-600 font-bold">
                    {u.wallet?.balance || 0} USD
                  </td>
                  <td className="py-6"><span className="text-blue-500 font-black text-[10px]">ACTIF</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}