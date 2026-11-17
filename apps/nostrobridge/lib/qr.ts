import QRCode from "qrcode";

export async function qrDataUrl(value: string): Promise<string> {
  return QRCode.toDataURL(value, {
    margin: 1,
    width: 280,
    color: { dark: "#0b1220", light: "#ffffff" },
  });
}
