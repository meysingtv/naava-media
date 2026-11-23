import type { Icon as PhosphorIcon } from "phosphor-react-native";
import { BusIcon } from "phosphor-react-native/src/icons/Bus";
import { CarIcon } from "phosphor-react-native/src/icons/Car";
import { MopedIcon } from "phosphor-react-native/src/icons/Moped";
import { MotorcycleIcon } from "phosphor-react-native/src/icons/Motorcycle";
import { TractorIcon } from "phosphor-react-native/src/icons/Tractor";
import { TruckIcon } from "phosphor-react-native/src/icons/Truck";
import { TruckTrailerIcon } from "phosphor-react-native/src/icons/TruckTrailer";

// Führerscheinklassen mit Symbol – für Einstellungen und Einrichtung.

export type Klasse = { id: string; text: string; kurz: string; symbol: PhosphorIcon };

export const KLASSEN: Klasse[] = [
  { id: "B", text: "Pkw bis 3,5 t", kurz: "Auto", symbol: CarIcon },
  { id: "BE", text: "Pkw mit Anhänger", kurz: "Auto mit Anhänger", symbol: CarIcon },
  { id: "AM", text: "Roller und Moped bis 45 km/h", kurz: "Moped & Roller", symbol: MopedIcon },
  { id: "A1", text: "Leichtkraftrad bis 125 cm³", kurz: "Leichtkraftrad", symbol: MotorcycleIcon },
  { id: "A2", text: "Motorrad bis 35 kW", kurz: "Motorrad", symbol: MotorcycleIcon },
  { id: "A", text: "Motorrad ohne Leistungsgrenze", kurz: "Motorrad offen", symbol: MotorcycleIcon },
  { id: "C1", text: "Lkw bis 7,5 t", kurz: "Kleiner Lkw", symbol: TruckIcon },
  { id: "C1E", text: "Lkw bis 7,5 t mit Anhänger", kurz: "Kleiner Lkw + Anhänger", symbol: TruckTrailerIcon },
  { id: "C", text: "Lkw über 3,5 t", kurz: "Lkw", symbol: TruckIcon },
  { id: "CE", text: "Lkw mit Anhänger", kurz: "Lkw mit Anhänger", symbol: TruckTrailerIcon },
  { id: "D1", text: "Kleinbus bis 16 Fahrgäste", kurz: "Kleinbus", symbol: BusIcon },
  { id: "D1E", text: "Kleinbus mit Anhänger", kurz: "Kleinbus + Anhänger", symbol: BusIcon },
  { id: "D", text: "Bus", kurz: "Bus", symbol: BusIcon },
  { id: "DE", text: "Bus mit Anhänger", kurz: "Bus mit Anhänger", symbol: BusIcon },
  { id: "L", text: "Zugmaschine bis 40 km/h", kurz: "Zugmaschine", symbol: TractorIcon },
  { id: "T", text: "Traktor bis 60 km/h", kurz: "Traktor", symbol: TractorIcon },
];

/** Die häufigsten Klassen – groß in der Einrichtung. */
export const HAUPT_KLASSEN = ["B", "A", "A1", "A2", "AM", "BE"];
