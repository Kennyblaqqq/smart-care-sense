import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Bluetooth, Wifi, Plus, Trash2, Copy, Check, Loader2, Radio, Battery, HeartPulse, Watch as WatchIcon } from "lucide-react";
import { AppShell } from "@/components/dashboard/AppShell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { isBluetoothAvailable, pairHeartRateMonitor } from "@/lib/bluetooth";
import { toast } from "sonner";

type Device = {
  id: string;
  name: string;
  device_type: string;
  connection_type: string;
  is_active: boolean;
  last_seen_at: string | null;
  api_key_prefix: string | null;
  created_at: string;
};

const INGEST_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ingest-vitals`;

async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function generateKey(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return "hp_" + Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

const Devices = () => {
  const { user } = useAuth();
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [btSupported, setBtSupported] = useState(false);
  const [pairing, setPairing] = useState(false);
  const [liveHR, setLiveHR] = useState<number | null>(null);
  const [liveDeviceName, setLiveDeviceName] = useState<string | null>(null);
  const [liveBattery, setLiveBattery] = useState<number | undefined>(undefined);
  const [disconnect, setDisconnect] = useState<(() => void) | null>(null);

  // Wi-Fi dialog
  const [wifiOpen, setWifiOpen] = useState(false);
  const [wifiName, setWifiName] = useState("");
  const [creating, setCreating] = useState(false);
  const [issuedKey, setIssuedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    document.title = "Devices — HealthPulse";
    isBluetoothAvailable().then(setBtSupported);
    return () => disconnect?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("devices")
      .select("id, name, device_type, connection_type, is_active, last_seen_at, api_key_prefix, created_at")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setDevices((data ?? []) as Device[]);
    setLoading(false);
  };

  useEffect(() => { if (user) load(); }, [user]);

  // Realtime: refresh on insert/update/delete to devices.
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel("devices-watch")
      .on("postgres_changes", { event: "*", schema: "public", table: "devices" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  const handlePairBLE = async () => {
    if (!user) return;
    setPairing(true);
    try {
      const { device, battery, disconnect: dc } = await pairHeartRateMonitor(async (bpm) => {
        setLiveHR(bpm);
        // Persist each beat sample as a vitals reading
        await supabase.from("vitals_readings").insert({
          user_id: user.id,
          metric_type: "heart_rate",
          value: bpm,
          unit: "bpm",
        });
      });
      setLiveDeviceName(device.name ?? "BLE Heart Rate Monitor");
      setLiveBattery(battery);
      setDisconnect(() => dc);

      // Upsert a device record (no API key needed for BLE — pairing is per-session).
      await supabase.from("devices").insert({
        user_id: user.id,
        name: device.name ?? "BLE Heart Rate Monitor",
        device_type: "smartwatch",
        connection_type: "bluetooth",
        is_active: true,
        last_seen_at: new Date().toISOString(),
        mac_address: device.id,
      });

      toast.success("Paired. Streaming heart rate live.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Pairing cancelled";
      toast.error(msg);
    } finally {
      setPairing(false);
    }
  };

  const handleDisconnectBLE = () => {
    disconnect?.();
    setDisconnect(null);
    setLiveHR(null);
    setLiveDeviceName(null);
    setLiveBattery(undefined);
    toast.success("Disconnected");
  };

  const handleCreateWifi = async () => {
    if (!user || !wifiName.trim()) return;
    setCreating(true);
    try {
      const key = generateKey();
      const hash = await sha256Hex(key);
      const prefix = key.slice(0, 10);
      const { error } = await supabase.from("devices").insert({
        user_id: user.id,
        name: wifiName.trim(),
        device_type: "smartwatch",
        connection_type: "wifi",
        is_active: true,
        api_key_hash: hash,
        api_key_prefix: prefix,
      });
      if (error) throw error;
      setIssuedKey(key);
      setWifiName("");
      toast.success("Device created. Copy the key now — it will not be shown again.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create device");
    } finally {
      setCreating(false);
    }
  };

  const closeWifiDialog = () => {
    setWifiOpen(false);
    setIssuedKey(null);
    setCopied(false);
    setWifiName("");
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("devices").delete().eq("id", id);
    if (error) toast.error(error.message);
    else toast.success("Device removed");
  };

  const copyKey = async () => {
    if (!issuedKey) return;
    await navigator.clipboard.writeText(issuedKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const curlExample = useMemo(() => {
    const k = issuedKey ?? "<YOUR_DEVICE_KEY>";
    return `curl -X POST '${INGEST_URL}' \\
  -H 'content-type: application/json' \\
  -H 'x-device-key: ${k}' \\
  -d '{"metric_type":"heart_rate","value":74,"unit":"bpm"}'`;
  }, [issuedKey]);

  return (
    <AppShell>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <header className="mb-8">
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">Devices</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Pair a smartwatch over Bluetooth, or register an IoT device that sends vitals over Wi-Fi.
          </p>
        </header>

        {/* Pairing actions */}
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          {/* Bluetooth */}
          <Card className="glass-card p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-xl bg-primary/15 flex items-center justify-center">
                  <Bluetooth className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="font-medium">Bluetooth (BLE)</div>
                  <div className="text-xs text-muted-foreground">Standard GATT Heart Rate · 0x180D</div>
                </div>
              </div>
              {btSupported ? (
                <Badge className="bg-success/15 text-success hover:bg-success/15">Available</Badge>
              ) : (
                <Badge variant="outline">Not supported</Badge>
              )}
            </div>

            {liveHR !== null ? (
              <div className="mt-5 rounded-xl border border-border bg-card/40 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-gradient-vital flex items-center justify-center">
                      <HeartPulse className="h-4 w-4 text-vital-foreground heartbeat" />
                    </div>
                    <div>
                      <div className="text-sm font-medium">{liveDeviceName}</div>
                      <div className="text-[11px] text-muted-foreground flex items-center gap-2">
                        <Radio className="h-3 w-3 text-success" /> Live
                        {liveBattery != null && (<><span>·</span><Battery className="h-3 w-3" /> {liveBattery}%</>)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-semibold tabular-nums text-vital">{liveHR}</div>
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground">bpm</div>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="mt-3 w-full" onClick={handleDisconnectBLE}>
                  Disconnect
                </Button>
              </div>
            ) : (
              <Button
                onClick={handlePairBLE}
                disabled={!btSupported || pairing}
                className="mt-5 w-full bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow"
              >
                {pairing ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Bluetooth className="h-4 w-4 mr-2" /> Pair heart rate monitor</>}
              </Button>
            )}

            {!btSupported && (
              <p className="text-[11px] text-muted-foreground mt-3">
                Web Bluetooth requires Chrome, Edge, or Opera on desktop/Android over HTTPS.
              </p>
            )}
          </Card>

          {/* Wi-Fi */}
          <Card className="glass-card p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-xl bg-accent/15 flex items-center justify-center">
                  <Wifi className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <div className="font-medium">Wi-Fi / HTTP ingest</div>
                  <div className="text-xs text-muted-foreground">For ESP32-style devices · per-device API key</div>
                </div>
              </div>
              <Badge className="bg-success/15 text-success hover:bg-success/15">Active</Badge>
            </div>

            <Dialog open={wifiOpen} onOpenChange={(o) => (o ? setWifiOpen(true) : closeWifiDialog())}>
              <DialogTrigger asChild>
                <Button className="mt-5 w-full" variant="outline">
                  <Plus className="h-4 w-4 mr-2" /> Register Wi-Fi device
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>{issuedKey ? "Device key issued" : "Register Wi-Fi device"}</DialogTitle>
                </DialogHeader>

                {!issuedKey ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="dname">Device name</Label>
                      <Input id="dname" placeholder="e.g. Living Room ESP32" value={wifiName} onChange={(e) => setWifiName(e.target.value)} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      We'll generate a one-time API key for your device. Store it securely on the device firmware — we only keep the hash.
                    </p>
                    <DialogFooter>
                      <Button variant="ghost" onClick={closeWifiDialog}>Cancel</Button>
                      <Button onClick={handleCreateWifi} disabled={!wifiName.trim() || creating}>
                        {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Generate key"}
                      </Button>
                    </DialogFooter>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <Label className="text-xs">API key (shown once)</Label>
                      <div className="mt-1 flex items-center gap-2">
                        <code className="flex-1 px-3 py-2 rounded-md bg-muted/50 text-xs break-all">{issuedKey}</code>
                        <Button size="icon" variant="outline" onClick={copyKey} aria-label="Copy">
                          {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">Send a reading</Label>
                      <pre className="mt-1 p-3 rounded-md bg-muted/50 text-[11px] overflow-x-auto whitespace-pre-wrap">{curlExample}</pre>
                    </div>
                    <DialogFooter>
                      <Button onClick={closeWifiDialog}>Done</Button>
                    </DialogFooter>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </Card>
        </div>

        {/* Device list */}
        <Card className="glass-card p-5">
          <Tabs defaultValue="all">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium">Your devices</h2>
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="bluetooth">Bluetooth</TabsTrigger>
                <TabsTrigger value="wifi">Wi-Fi</TabsTrigger>
              </TabsList>
            </div>

            {(["all", "bluetooth", "wifi"] as const).map((tab) => {
              const filtered = tab === "all" ? devices : devices.filter((d) => d.connection_type === tab);
              return (
                <TabsContent key={tab} value={tab} className="space-y-2">
                  {loading ? (
                    <div className="py-12 flex items-center justify-center text-muted-foreground">
                      <Loader2 className="h-5 w-5 animate-spin" />
                    </div>
                  ) : filtered.length === 0 ? (
                    <div className="py-12 text-center text-sm text-muted-foreground">
                      <WatchIcon className="h-8 w-8 mx-auto mb-2 opacity-40" />
                      No devices yet. Pair one above.
                    </div>
                  ) : (
                    filtered.map((d) => (
                      <div key={d.id} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card/30 hover:bg-card/50 transition-colors">
                        <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${d.connection_type === "bluetooth" ? "bg-primary/15 text-primary" : "bg-accent/15 text-accent"}`}>
                          {d.connection_type === "bluetooth" ? <Bluetooth className="h-4 w-4" /> : <Wifi className="h-4 w-4" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{d.name}</div>
                          <div className="text-[11px] text-muted-foreground flex items-center gap-2 flex-wrap">
                            <span className="capitalize">{d.connection_type}</span>
                            {d.api_key_prefix && <span className="font-mono">· {d.api_key_prefix}…</span>}
                            {d.last_seen_at && <span>· seen {new Date(d.last_seen_at).toLocaleString()}</span>}
                          </div>
                        </div>
                        <Badge variant="outline" className={d.is_active ? "border-success/40 text-success" : ""}>
                          {d.is_active ? "active" : "inactive"}
                        </Badge>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(d.id)} aria-label="Delete device">
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </div>
                    ))
                  )}
                </TabsContent>
              );
            })}
          </Tabs>
        </Card>
      </motion.div>
    </AppShell>
  );
};

export default Devices;