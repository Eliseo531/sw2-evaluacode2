type BreadcrumbItem = {
  label: string;
  onClick?: () => void;
};

type BreadcrumbProps = {
  items: BreadcrumbItem[];
};

function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <div className="flex items-center gap-2 text-sm text-slate-500 flex-wrap">
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          <button
            onClick={item.onClick}
            className="hover:text-blue-600 transition"
          >
            {item.label}
          </button>

          {index < items.length - 1 && <span>/</span>}
        </div>
      ))}
    </div>
  );
}

export default Breadcrumb;
