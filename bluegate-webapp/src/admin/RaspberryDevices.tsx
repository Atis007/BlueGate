import { useState, useEffect } from "react";
import "./RaspberryDevices.css";
import { supabase } from "../lib/supabase";

interface RaspberryDevice {
  id: number;
  terem: string;
  aktiv: boolean;
}

export default function RaspberryDevices() {
  const [devices, setDevices] = useState<RaspberryDevice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRoomsLoading, setIsRoomsLoading] = useState(true);
  const [roomOptions, setRoomOptions] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    terem: "",
    aktiv: true,
  });
  const [formErrors, setFormErrors] = useState<{ terem?: string }>({});
  const usedRooms = new Set(devices.map((device) => device.terem));
  const availableRooms = roomOptions.filter((room) => !usedRooms.has(room));

  useEffect(() => {
    fetchDevices();
    fetchRoomOptions();
  }, []);

  useEffect(() => {
    if (!isAddModalOpen) {
      return;
    }

    if (!formData.terem && availableRooms.length > 0) {
      setFormData((prev) => ({ ...prev, terem: availableRooms[0] }));
    }
  }, [availableRooms, formData.terem, isAddModalOpen]);

  const fetchDevices = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("raspberry_devices")
        .select("*")
        .order("id", { ascending: true });

      if (error) {
        console.error("Hiba történt:", error);
        alert("Hiba történt az adatok betöltése során");
        return;
      }

      setDevices(data || []);
    } catch (error) {
      console.error("Hiba történt:", error);
      alert("Hiba történt az adatok betöltése során");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRoomOptions = async () => {
    setIsRoomsLoading(true);

    try {
      const { data, error } = await supabase.rpc("get_enum_values", {
        enum_name: "terem_enum",
      });

      if (error) {
        console.error("Hiba történt:", error);
        alert("Hiba történt a terem lista betöltése során");
        return;
      }

      const options = (data || [])
        .map((item: { value?: string }) => item.value || "")
        .filter((value: string) => value.trim().length > 0);

      setRoomOptions(options);
    } catch (error) {
      console.error("Hiba történt:", error);
      alert("Hiba történt a terem lista betöltése során");
    } finally {
      setIsRoomsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ terem: "", aktiv: true });
    setFormErrors({});
  };

  const openModal = () => {
    resetForm();
    if (availableRooms.length > 0) {
      setFormData({ terem: availableRooms[0], aktiv: true });
    }
    setIsAddModalOpen(true);
  };

  const closeModal = () => {
    if (isSubmitting) {
      return;
    }
    setIsAddModalOpen(false);
  };

  const validateForm = () => {
    const errors: { terem?: string } = {};

    if (!formData.terem.trim()) {
      errors.terem = "A terem megadása kötelező.";
    } else if (usedRooms.has(formData.terem)) {
      errors.terem = "Ez a terem már hozzá van rendelve.";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddDevice = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from("raspberry_devices")
        .insert([
          {
            terem: formData.terem.trim(),
            aktiv: formData.aktiv,
          },
        ])
        .select();

      if (error) {
        console.error("Hiba történt:", error);
        alert(`Hiba: ${error.message}`);
        return;
      }

      await fetchDevices();
      setIsAddModalOpen(false);
    } catch (error) {
      console.error("Hiba történt:", error);
      alert("Hiba történt az adatok mentése során");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="raspberry-devices-container">
      <div className="raspberry-header">
        <h1>Raspberry Eszközök</h1>
        <div className="header-controls">
          <button
            type="button"
            className="add-button"
            onClick={openModal}
            disabled={
              isRoomsLoading || isLoading || availableRooms.length === 0
            }
          >
            Eszköz hozzáadása
          </button>
        </div>
      </div>

      {isLoading ? (
        <div style={{ color: "white", textAlign: "center", padding: "2rem" }}>
          Betöltés...
        </div>
      ) : (
        <div className="raspberry-table-container">
          <div className="raspberry-table-scroll">
            <div className="list-row list-header">
              <div className="list-cell">ID</div>
              <div className="list-cell">Terem</div>
              <div className="list-cell">Státusz</div>
            </div>

            {devices.length === 0 ? (
              <div
                style={{ padding: "2rem", textAlign: "center", color: "#fff" }}
              >
                Nincsenek eszközök.
              </div>
            ) : (
              devices.map((device) => (
                <div key={device.id} className="list-row">
                  <div className="list-cell">#{device.id}</div>
                  <div className="list-cell">{device.terem}</div>
                  <div className="list-cell">
                    <span
                      className={
                        device.aktiv ? "status-active" : "status-inactive"
                      }
                    >
                      {device.aktiv ? "Aktív" : "Inaktív"}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {isAddModalOpen && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div
            className="modal-card"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <h2>Eszköz hozzáadása</h2>
              <button
                type="button"
                className="modal-close"
                onClick={closeModal}
              >
                X
              </button>
            </div>
            <form className="modal-form" onSubmit={handleAddDevice}>
              <div className="form-field">
                <label htmlFor="terem">Terem</label>
                <select
                  id="terem"
                  value={formData.terem}
                  onChange={(event) => {
                    setFormData((prev) => ({
                      ...prev,
                      terem: event.target.value,
                    }));
                    if (formErrors.terem) {
                      setFormErrors({});
                    }
                  }}
                  disabled={
                    isSubmitting ||
                    isRoomsLoading ||
                    availableRooms.length === 0
                  }
                >
                  <option value="">
                    {isRoomsLoading
                      ? "Betöltés..."
                      : availableRooms.length === 0
                        ? "Nincs szabad terem"
                        : "Válassz termet"}
                  </option>
                  {availableRooms.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                {formErrors.terem && (
                  <span className="error-text">{formErrors.terem}</span>
                )}
              </div>
              <div className="form-field">
                <label htmlFor="status">Státusz</label>
                <select
                  id="status"
                  value={formData.aktiv ? "active" : "inactive"}
                  onChange={(event) =>
                    setFormData((prev) => ({
                      ...prev,
                      aktiv: event.target.value === "active",
                    }))
                  }
                  disabled={isSubmitting}
                >
                  <option value="active">Aktív</option>
                  <option value="inactive">Inaktív</option>
                </select>
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="modal-secondary"
                  onClick={closeModal}
                >
                  Mégse
                </button>
                <button
                  type="submit"
                  className="modal-primary"
                  disabled={
                    isSubmitting ||
                    isRoomsLoading ||
                    availableRooms.length === 0
                  }
                >
                  {isSubmitting ? "Mentés..." : "Mentés"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
