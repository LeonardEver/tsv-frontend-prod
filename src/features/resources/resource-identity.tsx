/**
 * Resource identity (Phase 16 §10/§19): field-resource artifacts get a
 * semantic icon from the authoritative resource_type — equipment, not
 * database rows. Unknown types fall back to the neutral file glyph.
 */
import type { LucideIcon } from "lucide-react";
import { BookOpen, ClipboardList, FileText, Map, Table } from "lucide-react";

const RESOURCE_TYPE_ICONS: Record<string, LucideIcon> = {
  checklist: ClipboardList,
  table: Table,
  guide: BookOpen,
  map: Map,
  pdf: FileText,
};

export function getResourceTypeIcon(resourceType: string): LucideIcon {
  return RESOURCE_TYPE_ICONS[resourceType] ?? FileText;
}
