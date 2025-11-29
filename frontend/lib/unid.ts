declare const __brand: unique symbol;
export type Unid = string & { readonly [__brand]: "Unid" };
export function asUnid(s: string): Unid {
  return s as Unid;
}
