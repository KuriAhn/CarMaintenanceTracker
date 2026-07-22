import { useEffect, useState } from "react";
import {
  vehicle as initialVehicle,
  filterCategories,
  maintenanceSections as initialMaintenanceSections,
  createBlankMaintenanceSections,
  createSampleMaintenanceSections,
} from "./data/maintenance";
import { formatShortDate } from "./lib/maintenanceCalc";
import VehicleHeader from "./components/VehicleHeader";
import CategoryFilters from "./components/CategoryFilters";
import MaintenanceSection from "./components/MaintenanceSection";
import DetailPanel from "./components/DetailPanel";
import UpdateMaintenanceModal from "./components/UpdateMaintenanceModal";
import AddVinModal from "./components/AddVinModal";
import Toast from "./components/Toast";
import EmptyVehicleState from "./components/EmptyVehicleState";
import { loadPersistedState, savePersistedState } from "./lib/persistence";

function App() {
  const [persisted] = useState(() => loadPersistedState());
  const [vehicle, setVehicle] = useState(persisted?.vehicle ?? initialVehicle);
  const [maintenanceSections, setMaintenanceSections] = useState(
    persisted?.maintenanceSections ?? initialMaintenanceSections
  );
  const [isModalOpen, setModalOpen] = useState(false);
  const [isVinModalOpen, setVinModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState(
    filterCategories.find((c) => c.active)?.id ?? filterCategories[0].id
  );
  const [selectedItemId, setSelectedItemId] = useState<string | undefined>(
    maintenanceSections
      .flatMap((section) => section.items)
      .find((item) => item.selected)?.id
  );

  const sections = maintenanceSections
    .filter((section) => activeFilter === "all" || section.id === activeFilter)
    .map((section) => ({
      ...section,
      items: section.items.map((item) => ({
        ...item,
        selected: item.id === selectedItemId,
      })),
    }));

  function handleUpdateSubmit(miles: number, date: Date, completedItemIds: Set<string>) {
    setVehicle((prev) =>
      miles >= prev.mileage
        ? { ...prev, mileage: miles, currentDate: date, lastRecorded: formatShortDate(date) }
        : prev
    );
    setMaintenanceSections((prev) =>
      prev.map((section) => ({
        ...section,
        items: section.items.map((item) =>
          completedItemIds.has(item.id)
            ? { ...item, lastCompletedMileage: miles, lastCompletedDate: date }
            : item
        ),
      }))
    );
    setModalOpen(false);
    setToastMessage("Maintenance updated successfully");
  }

  function handleVinSubmit(
    vin: string,
    decoded: { name: string; mileage: number; date: Date },
    isSample?: boolean
  ) {
    const isNewVehicle = vin !== vehicle.vin;
    setVehicle((prev) => {
      const identity = { ...prev, vin, name: decoded.name };
      // A different VIN means a different physical vehicle, so the entered
      // mileage/date become the new baseline outright. For the same VIN,
      // still only advance mileage/date forward, same as manual updates.
      if (isNewVehicle || decoded.mileage >= prev.mileage) {
        return {
          ...identity,
          mileage: decoded.mileage,
          currentDate: decoded.date,
          lastRecorded: formatShortDate(decoded.date),
        };
      }
      return identity;
    });
    if (isNewVehicle) {
      // A different VIN means a different physical vehicle — its service
      // history doesn't carry over, so the maintenance schedule resets.
      // "View Sample" gets randomized-but-plausible history instead of a
      // blank slate, so the demo actually has something to look at.
      setMaintenanceSections(
        isSample ? createSampleMaintenanceSections(decoded.mileage, decoded.date) : createBlankMaintenanceSections()
      );
    }
    setVinModalOpen(false);
    setToastMessage(isSample ? "Sample vehicle loaded" : "VIN updated successfully");
  }

  useEffect(() => {
    savePersistedState(vehicle, maintenanceSections);
  }, [vehicle, maintenanceSections]);

  return (
    <div className="h-screen w-full overflow-hidden bg-page-bg">
      <div className="flex h-full w-full gap-8 p-8">
        <div className="flex flex-1 min-w-0 flex-col items-start gap-8">
          {vehicle.vin ? (
            <>
              <div className="flex w-full flex-shrink-0 flex-col items-start gap-4">
                <VehicleHeader
                  vehicle={vehicle}
                  onUpdate={() => setModalOpen(true)}
                  onAddVin={() => setVinModalOpen(true)}
                />
                <div className="h-px w-full bg-divider" />
                <CategoryFilters
                  categories={filterCategories}
                  activeId={activeFilter}
                  onSelect={setActiveFilter}
                />
              </div>

              <div className="scroll-panel flex w-full min-h-0 flex-1 flex-col items-start gap-8 overflow-y-auto pr-4">
                {sections.map((section) => (
                  <MaintenanceSection
                    key={section.id}
                    section={section}
                    vehicle={vehicle}
                    onSelectItem={setSelectedItemId}
                  />
                ))}
              </div>
            </>
          ) : (
            <EmptyVehicleState onAddVin={() => setVinModalOpen(true)} />
          )}
        </div>

        <DetailPanel maintenanceSections={maintenanceSections} selectedItemId={selectedItemId} />
      </div>

      {isModalOpen && (
        <UpdateMaintenanceModal
          vehicle={vehicle}
          sections={maintenanceSections}
          onClose={() => setModalOpen(false)}
          onSubmit={handleUpdateSubmit}
        />
      )}

      {isVinModalOpen && (
        <AddVinModal
          initialVin={vehicle.vin}
          initialMileage={vehicle.mileage}
          initialDate={vehicle.currentDate}
          onClose={() => setVinModalOpen(false)}
          onSubmit={handleVinSubmit}
        />
      )}

      {toastMessage && (
        <Toast message={toastMessage} onDismiss={() => setToastMessage(null)} />
      )}
    </div>
  );
}

export default App;
