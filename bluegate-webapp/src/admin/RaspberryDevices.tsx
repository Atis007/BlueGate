import { useState, useEffect } from 'react';
import './RaspberryDevices.css';
import { supabase } from '../lib/supabase';

interface RaspberryDevice {
  id: number;
  terem: string;
  aktiv: boolean;
}

export default function RaspberryDevices() {
  const [devices, setDevices] = useState<RaspberryDevice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDevices();
  }, []);

  const fetchDevices = async () => {
    try {
      const { data, error } = await supabase
        .from('raspberry_devices')
        .select('*')
        .order('id', { ascending: true });

      if (error) {
        console.error('Hiba történt:', error);
        alert('Hiba történt az adatok betöltése során');
        return;
      }

      setDevices(data || []);
    } catch (error) {
      console.error('Hiba történt:', error);
      alert('Hiba történt az adatok betöltése során');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="raspberry-devices-container">
      <div className="raspberry-header">
        <h1>Raspberry Eszközök</h1>
      </div>

      {isLoading ? (
        <div style={{ color: 'white', textAlign: 'center', padding: '2rem' }}>Betöltés...</div>
      ) : (
        <div className="raspberry-table-container">
          <div className="list-row list-header">
            <div className="list-cell">ID</div>
            <div className="list-cell">Terem</div>
            <div className="list-cell">Státusz</div>
          </div>
          
          {devices.length === 0 ? (
             <div style={{ padding: '2rem', textAlign: 'center', color: '#fff' }}>
                Nincsenek eszközök.
             </div>
          ) : (
            devices.map((device) => (
              <div key={device.id} className="list-row">
                <div className="list-cell">#{device.id}</div>
                <div className="list-cell">{device.terem}</div>
                <div className="list-cell">
                   <span className={device.aktiv ? 'status-active' : 'status-inactive'}>
                      {device.aktiv ? 'Aktív' : 'Inaktív'}
                   </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
