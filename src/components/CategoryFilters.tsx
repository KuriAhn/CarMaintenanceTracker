import type { FilterCategory } from "../data/maintenance";

interface CategoryFiltersProps {
  categories: FilterCategory[];
  activeId: string;
  onSelect?: (id: string) => void;
}

export default function CategoryFilters({
  categories,
  activeId,
  onSelect,
}: CategoryFiltersProps) {
  return (
    <div className="flex gap-2 items-center w-full">
      {categories.map((category) => {
        const isActive = category.id === activeId;
        return (
          <button
            key={category.id}
            type="button"
            onClick={() => onSelect?.(category.id)}
            className={
              isActive
                ? "flex cursor-pointer items-center rounded-full border border-accent-blue bg-accent-blue px-3 py-1 text-base font-medium text-white"
                : "flex cursor-pointer items-center rounded-full border border-card-border bg-white px-3 py-1 text-base font-medium text-muted"
            }
          >
            {category.label}
          </button>
        );
      })}
    </div>
  );
}
