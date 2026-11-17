declare module "@wizardconnect/react" {
  export function useWizardConnect(options?: {
    dappName?: string;
    dappIcon?: string;
    sessionKey?: string;
    persistSession?: boolean;
  }): {
    state: "idle" | "connecting" | "connected" | "disconnected";
    manager: {
      getPubkey: (account: number, index: bigint) => Uint8Array | string | undefined;
    } | null;
    uri: string | null;
    qrUri: string | null;
    walletName: string | null;
    walletIcon: string | null;
    connect: () => boolean;
    disconnect: () => Promise<void>;
    error: string | null;
  };

  export function WizardConnectQRDialog(props: {
    show: boolean;
    onClose: () => void;
    uri: string;
    qrUri: string;
    title?: string;
    subtitle?: string;
  }): React.JSX.Element;
}
