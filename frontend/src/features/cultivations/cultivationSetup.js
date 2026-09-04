import { normalizeList } from "../../utils/formatters";

export function requiresSensorSetup(cultivation, sensors) {
  return (
    normalizeList(sensors).length === 0 && !["FINISHED", "DELETED"].includes(cultivation?.status)
  );
}
