export {};

declare global {
  interface Window {
    jspdf?: {
      jsPDF: new (...args: any[]) => any;
    };
  }
}
