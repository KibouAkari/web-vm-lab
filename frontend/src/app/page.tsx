"use client";

import { useMemo, useState } from "react";
import {
  FaNetworkWired,
  FaPowerOff,
  FaPlus,
  FaStar,
  FaWindows,
  FaTrash,
} from "react-icons/fa";
import {
  SiUbuntu,
  SiDebian,
  SiArchlinux,
  SiKalilinux,
  SiFedora,
  SiRedhat,
  SiOpensuse,
  SiFreebsd,
} from "react-icons/si";
import { motion, AnimatePresence } from "framer-motion";

/* ----------------------------- Types ----------------------------- */

// Port-Regel für VM-Netzwerk
type PortRule = {
  id: string;
  port: number;
  protocol: "TCP" | "UDP";
  allowed: boolean;
};

// VM-Objekt
type VMInfo = {
  id: string;
  name: string;
  ip: string;
  osId: string;
  status: "starting" | "running";
  network: {
    mode: "dhcp" | "static";
    staticIp?: string;
    ports: PortRule[];
  };
};

// Betriebssystem-Option
type OSOption = {
  id: string;
  label: string;
  icon: React.ReactElement;
};

/* ------------------------- Static OS List ------------------------- */

const ALL_OS: OSOption[] = [
  {
    id: "ubuntu",
    label: "Ubuntu 22.04",
    icon: <SiUbuntu className="text-orange-500" />,
  },
  {
    id: "debian",
    label: "Debian",
    icon: <SiDebian className="text-red-500" />,
  },
  {
    id: "arch",
    label: "Arch Linux",
    icon: <SiArchlinux className="text-blue-400" />,
  },
  {
    id: "kali",
    label: "Kali Linux",
    icon: <SiKalilinux className="text-blue-300" />,
  },
  {
    id: "fedora",
    label: "Fedora",
    icon: <SiFedora className="text-blue-600" />,
  },
  {
    id: "rhel",
    label: "Red Hat Enterprise Linux",
    icon: <SiRedhat className="text-red-600" />,
  },
  {
    id: "opensuse",
    label: "openSUSE",
    icon: <SiOpensuse className="text-green-500" />,
  },
  {
    id: "freebsd",
    label: "FreeBSD",
    icon: <SiFreebsd className="text-red-500" />,
  },
  {
    id: "win11",
    label: "Windows 11",
    icon: <FaWindows className="text-blue-500" />,
  },
  {
    id: "win10",
    label: "Windows 10",
    icon: <FaWindows className="text-blue-400" />,
  },
  {
    id: "ws2019",
    label: "Windows Server 2019",
    icon: <FaWindows className="text-cyan-400" />,
  },
  {
    id: "ws2022",
    label: "Windows Server 2022",
    icon: <FaWindows className="text-cyan-500" />,
  },
];

/* --------------------------- Komponente --------------------------- */

export default function Home() {
  // Favoriten-IDs, ausgewähltes OS, VMs, aktives VM, Ladezustand, Limit-Modal, Netzwerk-Dropdown
  const [favOrder, setFavOrder] = useState<string[]>([]);
  const [selectedOs, setSelectedOs] = useState<string>("ubuntu");
  const [vms, setVms] = useState<VMInfo[]>([]);
  const [activeVm, setActiveVm] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [limitModal, setLimitModal] = useState(false);
  const [networkOpen, setNetworkOpen] = useState(false);

  const MAX_VMS = 3;

  // Favoriten und andere OS berechnen
  const favoriteOS: OSOption[] = useMemo(
    () =>
      favOrder
        .map((id) => ALL_OS.find((o) => o.id === id))
        .filter(Boolean) as OSOption[],
    [favOrder]
  );
  const otherOS: OSOption[] = useMemo(
    () => ALL_OS.filter((o) => !favOrder.includes(o.id)),
    [favOrder]
  );

  // Favorit toggeln
  const toggleFavorite = (id: string) => {
    setFavOrder((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // Hilfsfunktion für API-Call
  async function vmApi(action: string, data: any = {}) {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/vm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...data }),
    });
    if (!res.ok) throw new Error("API Error");
    return await res.json();
  }

  // VM starten
  const startVM = async () => {
    if (vms.length >= MAX_VMS) {
      setLimitModal(true);
      return;
    }
    setLoading(true);
    try {
      const result = await vmApi("start", { os: selectedOs });
      const newVm: VMInfo = {
        id: result.vmName,
        name: result.vmName,
        ip: result.ip,
        osId: selectedOs,
        status: "starting",
        network: {
          mode: "dhcp",
          ports: [{ id: "1", port: 22, protocol: "TCP", allowed: true }],
        },
      };
      setVms((prev) => [...prev, newVm]);
      setActiveVm(newVm.id);
      // Status nach kurzer Zeit auf "running" setzen
      setTimeout(() => {
        setVms((prev) =>
          prev.map((vm) =>
            vm.id === newVm.id ? { ...vm, status: "running" } : vm
          )
        );
        setLoading(false);
      }, 1400);
    } catch (e) {
      setLoading(false);
      alert("VM konnte nicht gestartet werden.");
    }
  };

  // VM beenden/löschen
  const terminateVM = async (id: string) => {
    try {
      await vmApi("delete", { vmName: id });
      setVms((prev) => prev.filter((vm) => vm.id !== id));
      if (activeVm === id) setActiveVm(null);
    } catch (e) {
      alert("VM konnte nicht gelöscht werden.");
    }
  };

  // Netzwerk-Einstellungen aktualisieren
  const updateVmNetwork = (id: string, network: VMInfo["network"]) => {
    setVms((prev) =>
      prev.map((vm) => (vm.id === id ? { ...vm, network } : vm))
    );
  };

  const activeVmData = vms.find((vm) => vm.id === activeVm);

  /* ---------------------------- UI ---------------------------- */

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
      {/* Sidebar: OS-Auswahl, Start-Button, VM-Liste */}
      <aside className="w-80 bg-white/5 backdrop-blur-lg p-5 flex flex-col border-r border-gray-700">
        <h1 className="text-2xl font-bold mb-2 tracking-wide">
          ☁️ Cloud VM Lab
        </h1>
        <p className="text-sm text-gray-400 mb-4">
          Starte vollwertige VMs (currently just a Demo). Favorisiere Systeme,
          um sie oben zu pinnen.
        </p>

        {/* OS-Auswahl */}
        <div className="rounded-xl border border-gray-700">
          <div className="p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-300">Betriebssysteme</span>
              <span className="text-xs text-gray-500">
                {favoriteOS.length} Favoriten
              </span>
            </div>
            <div className="space-y-2 max-h-[260px] overflow-y-auto nice-scroll pr-1">
              {/* Favoriten oben */}
              {favoriteOS.map((o) => (
                <motion.div
                  key={o.id}
                  className={`flex items-center justify-between rounded-lg px-3 h-12 cursor-pointer select-none transition
                    ${
                      selectedOs === o.id
                        ? "ring-2 ring-orange-400 font-semibold bg-orange-500/30"
                        : "bg-white/10 hover:bg-white/15"
                    }`}
                >
                  <button
                    onClick={() => setSelectedOs(o.id)}
                    className="flex items-center space-x-2 flex-1 text-left"
                  >
                    <span className="text-xl">{o.icon}</span>
                    <span className="truncate">{o.label}</span>
                  </button>
                  <button
                    className="ml-3 text-yellow-400 hover:scale-110 transition"
                    title="Aus Favoriten entfernen"
                    onClick={() => toggleFavorite(o.id)}
                  >
                    <FaStar />
                  </button>
                </motion.div>
              ))}
              {/* Andere OS darunter */}
              {otherOS.map((o) => (
                <motion.div
                  key={o.id}
                  className={`flex items-center justify-between rounded-lg px-3 h-12 cursor-pointer select-none transition
                    ${
                      selectedOs === o.id
                        ? "ring-2 ring-orange-400 font-semibold bg-orange-500/30"
                        : "bg-white/5 hover:bg-white/10"
                    }`}
                >
                  <button
                    onClick={() => setSelectedOs(o.id)}
                    className="flex items-center space-x-2 flex-1 text-left"
                  >
                    <span className="text-xl">{o.icon}</span>
                    <span className="truncate">{o.label}</span>
                  </button>
                  <button
                    className={`ml-3 transition ${
                      favOrder.includes(o.id)
                        ? "text-yellow-400"
                        : "text-gray-500 hover:text-gray-300 hover:scale-110"
                    }`}
                    title={
                      favOrder.includes(o.id)
                        ? "Favorit"
                        : "Zu Favoriten hinzufügen"
                    }
                    onClick={() => toggleFavorite(o.id)}
                  >
                    <FaStar />
                  </button>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* VM starten */}
        <button
          onClick={startVM}
          disabled={loading}
          className="mt-5 flex items-center justify-center space-x-2 bg-green-600 hover:bg-green-500 p-3 rounded-lg transition font-semibold"
        >
          <FaPlus />
          <span>{loading ? "Starte VM..." : "Neue VM starten"}</span>
        </button>

        {/* VM-Liste */}
        <h2 className="mt-7 mb-2 text-sm text-gray-400">Deine VMs</h2>
        <div className="space-y-2 overflow-y-auto nice-scroll pr-1">
          {vms.map((vm) => {
            const os = ALL_OS.find((o) => o.id === vm.osId);
            return (
              <div
                key={vm.id}
                className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition ${
                  activeVm === vm.id
                    ? "bg-white/10 border border-gray-500"
                    : "hover:bg-white/5"
                }`}
                onClick={() => setActiveVm(vm.id)}
              >
                <div className="flex items-center space-x-2">
                  <span className="text-lg">{os?.icon}</span>
                  <div>
                    <span className="font-semibold">{vm.name}</span>
                    <p className="text-xs text-gray-400">
                      {vm.status === "starting"
                        ? "⏳ Wird gestartet..."
                        : "✅ Läuft"}
                    </p>
                  </div>
                </div>
                <button
                  className="text-red-400 hover:text-red-300"
                  onClick={(e) => {
                    e.stopPropagation();
                    terminateVM(vm.id);
                  }}
                >
                  <FaPowerOff />
                </button>
              </div>
            );
          })}
        </div>
      </aside>

      {/* Main: VM-Details und Netzwerk-Einstellungen */}
      <main className="flex-1 flex flex-col relative">
        {activeVmData ? (
          <>
            <header className="bg-white/5 backdrop-blur-lg p-4 flex justify-between items-center border-b border-gray-700 relative">
              <h2 className="text-lg font-semibold">
                {activeVmData.name}{" "}
                <span className="text-gray-400">({activeVmData.ip})</span>
              </h2>
              <div className="flex space-x-4 relative">
                {/* Netzwerk-Dropdown */}
                <div className="relative">
                  <button
                    className="flex items-center space-x-2 bg-gray-700/50 p-2 rounded-lg hover:bg-gray-600/50"
                    onClick={() => setNetworkOpen((v) => !v)}
                  >
                    <FaNetworkWired /> <span>Netzwerk</span>
                  </button>

                  <AnimatePresence>
                    {networkOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.98 }}
                        animate={{ opacity: 1, y: 8, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.98 }}
                        transition={{
                          type: "spring",
                          stiffness: 400,
                          damping: 26,
                        }}
                        className="absolute right-0 z-50 w-80 bg-gray-900 border border-gray-700 rounded-xl shadow-xl p-4"
                      >
                        <div className="absolute -top-2 right-6 w-3 h-3 rotate-45 bg-gray-900 border-t border-l border-gray-700" />
                        <h4 className="font-semibold mb-2">Netzwerk</h4>

                        {/* IP Modus */}
                        <label className="block text-sm mb-1">IP Modus</label>
                        <select
                          value={activeVmData.network.mode}
                          onChange={(e) =>
                            updateVmNetwork(activeVmData.id, {
                              ...activeVmData.network,
                              mode: e.target.value as "dhcp" | "static",
                            })
                          }
                          className="w-full p-2 rounded bg-gray-800 border border-gray-600 mb-3"
                        >
                          <option value="dhcp">DHCP (Automatisch)</option>
                          <option value="static">Statisch</option>
                        </select>

                        {/* Statische IP */}
                        {activeVmData.network.mode === "static" && (
                          <>
                            <label className="block text-sm mb-1">
                              Statische IP
                            </label>
                            <input
                              type="text"
                              value={activeVmData.network.staticIp || ""}
                              placeholder="z. B. 10.0.0.42"
                              onChange={(e) =>
                                updateVmNetwork(activeVmData.id, {
                                  ...activeVmData.network,
                                  staticIp: e.target.value,
                                })
                              }
                              className="w-full p-2 rounded bg-gray-800 border border-gray-600 mb-3"
                            />
                          </>
                        )}

                        {/* Ports */}
                        <div className="mb-2 flex items-center justify-between">
                          <h5 className="font-semibold">Port-Freigaben</h5>
                          <button
                            onClick={() =>
                              updateVmNetwork(activeVmData.id, {
                                ...activeVmData.network,
                                ports: [
                                  ...activeVmData.network.ports,
                                  {
                                    id: `${Date.now()}`,
                                    port: 80,
                                    protocol: "TCP",
                                    allowed: true,
                                  },
                                ],
                              })
                            }
                            className="text-sm px-2 py-1 rounded bg-blue-600 hover:bg-blue-500"
                          >
                            + Port
                          </button>
                        </div>

                        <div className="space-y-2 max-h-28 overflow-y-auto nice-scroll pr-1">
                          {activeVmData.network.ports.map((rule) => (
                            <div
                              key={rule.id}
                              className="flex items-center justify-between text-sm bg-white/5 rounded px-2 py-1"
                            >
                              <span>
                                {rule.protocol} {rule.port} —{" "}
                                {rule.allowed ? "Erlaubt" : "Blockiert"}
                              </span>
                              <button
                                className="text-red-400 hover:text-red-300"
                                onClick={() =>
                                  updateVmNetwork(activeVmData.id, {
                                    ...activeVmData.network,
                                    ports: activeVmData.network.ports.filter(
                                      (p) => p.id !== rule.id
                                    ),
                                  })
                                }
                                title="Entfernen"
                              >
                                <FaTrash />
                              </button>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* VM beenden */}
                <button
                  className="flex items-center space-x-2 bg-red-600 p-2 rounded-lg hover:bg-red-500"
                  onClick={() => terminateVM(activeVmData.id)}
                >
                  <FaPowerOff /> <span>Terminate</span>
                </button>
              </div>
            </header>

            {/* Fake Viewer */}
            <div className="flex-1 flex items-center justify-center bg-black/80 text-gray-500 text-lg">
              {activeVmData.status === "starting"
                ? "💻 VM wird hochgefahren..."
                : `🔹 VM läuft unter ${activeVmData.ip}`}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500 text-lg">
            Wähle oder starte eine VM, um sie hier zu steuern.
          </div>
        )}

        {/* Limit Modal */}
        {limitModal && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-gray-900 p-6 rounded-xl shadow-lg border border-gray-700 max-w-sm text-center">
              <h3 className="text-xl font-bold mb-3">🚀 Limit erreicht!</h3>
              <p className="text-gray-300 mb-4">
                Es dürfen maximal <span className="font-semibold">3 VMs</span>{" "}
                gleichzeitig laufen. Mehr würden sogar Chuck Norris’ Laptop ins
                Schwitzen bringen – und wir wollen ja nicht, dass dein Browser
                in Flammen aufgeht. 🔥
              </p>
              <button
                onClick={() => setLimitModal(false)}
                className="bg-green-600 hover:bg-green-500 px-4 py-2 rounded-lg font-semibold"
              >
                Ok, verstanden 😅
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
