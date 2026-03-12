declare module "encoding-japanese" {
  export function detect(data: Uint8Array | number[]): string;
  export function convert(
    data: Uint8Array | number[],
    options: { to: string; from: string; type?: string }
  ): number[];
  export function codeToString(data: number[]): string;
}
