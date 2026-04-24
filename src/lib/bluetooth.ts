// Web Bluetooth helpers for standard GATT health services.
// Heart Rate Service: 0x180D, Heart Rate Measurement: 0x2A37
// Battery Service:    0x180F, Battery Level:           0x2A19

export type HRListener = (bpm: number) => void;

export async function isBluetoothAvailable(): Promise<boolean> {
  // @ts-ignore - experimental web bluetooth
  if (!navigator.bluetooth) return false;
  try {
    // @ts-ignore
    return await navigator.bluetooth.getAvailability();
  } catch {
    return false;
  }
}

function parseHeartRate(value: DataView): number {
  const flags = value.getUint8(0);
  const is16 = (flags & 0x01) !== 0;
  return is16 ? value.getUint16(1, true) : value.getUint8(1);
}

export async function pairHeartRateMonitor(onHR: HRListener): Promise<{
  device: BluetoothDevice;
  battery?: number;
  disconnect: () => void;
}> {
  // @ts-ignore - experimental web bluetooth
  const device: BluetoothDevice = await navigator.bluetooth.requestDevice({
    filters: [{ services: ["heart_rate"] }],
    optionalServices: ["battery_service"],
  });

  const server = await device.gatt!.connect();
  const hrService = await server.getPrimaryService("heart_rate");
  const hrChar = await hrService.getCharacteristic("heart_rate_measurement");
  await hrChar.startNotifications();
  hrChar.addEventListener("characteristicvaluechanged", (e: Event) => {
    const v = (e.target as BluetoothRemoteGATTCharacteristic).value;
    if (v) onHR(parseHeartRate(v));
  });

  let battery: number | undefined;
  try {
    const batt = await server.getPrimaryService("battery_service");
    const lvl = await batt.getCharacteristic("battery_level");
    const v = await lvl.readValue();
    battery = v.getUint8(0);
  } catch {
    // battery is optional
  }

  return {
    device,
    battery,
    disconnect: () => {
      try { device.gatt?.disconnect(); } catch { /* noop */ }
    },
  };
}