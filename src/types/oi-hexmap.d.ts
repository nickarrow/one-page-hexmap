import type { HexData, HexJSON } from './index';

export interface HexmapOptions {
  hexjson: HexJSON | string;
  patterns?: string[];
  label?: {
    show?: boolean;
    clip?: boolean;
    format?: (txt: string, attr: LabelAttributes) => string;
  };
  ready?: (this: Hexmap) => void;
}

export interface LabelAttributes {
  hex: HexData;
  size: number;
  'font-size': number;
  x: number;
  y: number;
}

export interface HexArea {
  data: HexData;
  hex: SVGGElement;
  path: SVGPathElement;
  label?: SVGTextElement;
}

export interface Hexmap {
  el: HTMLElement;
  areas: Record<string, HexArea>;
  mapping: HexJSON;

  load(file: string | HexJSON, callback?: () => void): Hexmap;
  updateColours(fn?: (region: string) => string): Hexmap;
  on(event: 'mouseover' | 'mouseout' | 'click', callback: (e: HexEvent) => void): Hexmap;
}

export interface HexEvent {
  data: {
    hexmap: Hexmap;
    region: string;
    data: HexData;
  };
}

declare global {
  const OI: {
    hexmap: new (el: HTMLElement, options?: HexmapOptions) => Hexmap;
    ready: (fn: () => void) => void;
  };
}
