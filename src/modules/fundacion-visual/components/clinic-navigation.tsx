"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import type {
  NavigationIcon,
  NavigationSection,
  OperationalDayStatus,
} from "../types/navigation";

interface ClinicNavigationProps {
  operationalDayStatus: OperationalDayStatus;
  sections: readonly NavigationSection[];
}

interface NavigationIconProps {
  icon: NavigationIcon;
}

function NavigationIconGraphic({ icon }: NavigationIconProps) {
  if (icon === "commissions") {
    return (
      <svg
        aria-hidden="true"
        className="navigation__icon"
        viewBox="0 0 24 24"
      >
        <path d="M7 17 17 7M8 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM16 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
      </svg>
    );
  }

  if (icon === "reports") {
    return (
      <svg
        aria-hidden="true"
        className="navigation__icon"
        viewBox="0 0 24 24"
      >
        <path d="M5 19V9M10 19V5M15 19v-7M20 19V7M4 19.5h17" />
      </svg>
    );
  }

  if (icon === "deposits") {
    return (
      <svg
        aria-hidden="true"
        className="navigation__icon"
        viewBox="0 0 24 24"
      >
        <path d="m4 9 8-4 8 4M5 19h14M7 10v6M12 10v6M17 10v6M4 8.5h16" />
      </svg>
    );
  }

  if (icon === "reconciliation") {
    return (
      <svg
        aria-hidden="true"
        className="navigation__icon"
        viewBox="0 0 24 24"
      >
        <path d="M5 5h14v14H5zM8 9h8M8 12h3M8 15h3M15 12v3M13.5 13.5h3" />
      </svg>
    );
  }

  if (icon === "cash") {
    return (
      <svg
        aria-hidden="true"
        className="navigation__icon"
        viewBox="0 0 24 24"
      >
        <path d="M4.5 7h15v10h-15zM8 12h.01M16 12h.01M12 14.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
      </svg>
    );
  }

  if (icon === "services") {
    return (
      <svg
        aria-hidden="true"
        className="navigation__icon"
        viewBox="0 0 24 24"
      >
        <path d="M5 5h14v14H5zM8.5 9h7M8.5 12h7M8.5 15h4" />
      </svg>
    );
  }

  if (icon === "patients") {
    return (
      <svg
        aria-hidden="true"
        className="navigation__icon"
        viewBox="0 0 24 24"
      >
        <path d="M16 19.5v-1.25A3.25 3.25 0 0 0 12.75 15h-5.5A3.25 3.25 0 0 0 4 18.25v1.25M10 11.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM17 8h4M19 6v4" />
      </svg>
    );
  }

  return (
    <svg
      aria-hidden="true"
      className="navigation__icon"
      viewBox="0 0 24 24"
    >
      <path d="m4 10.5 8-6.5 8 6.5v8a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5v-8Z" />
      <path d="M9.5 20v-5.5h5V20" />
    </svg>
  );
}

export function ClinicNavigation({
  operationalDayStatus,
  sections,
}: ClinicNavigationProps) {
  const pathname = usePathname();

  return (
    <nav className="navigation" aria-label="Navegación principal">
      {sections.map((section) => (
        <section
          aria-labelledby={`navigation-${section.type}`}
          className="navigation__group"
          key={section.type}
        >
          <p
            className="navigation__group-label"
            id={`navigation-${section.type}`}
          >
            {section.label}
          </p>
          <div className="navigation__group-items">
            {section.items.map((item) => {
              const isActive =
                pathname === item.href ||
                pathname.startsWith(`${item.href}/`);
              const isLocked =
                operationalDayStatus === "pending" && !item.isEntryPoint;

              return (
                <Link
                  aria-current={isActive ? "page" : undefined}
                  aria-disabled={isLocked || undefined}
                  className={`navigation__link${
                    isActive ? " navigation__link--active" : ""
                  }${isLocked ? " navigation__link--locked" : ""}`}
                  href={item.href}
                  key={item.href}
                  onClick={
                    isLocked
                      ? (event) => event.preventDefault()
                      : undefined
                  }
                  tabIndex={isLocked ? -1 : undefined}
                  title={
                    isLocked
                      ? "Disponible después de abrir la caja."
                      : undefined
                  }
                >
                  <NavigationIconGraphic icon={item.icon} />
                  <span className="navigation__link-label">
                    {item.label}
                  </span>
                  {item.isEntryPoint ? (
                    <span className="navigation__entry-badge">Inicio</span>
                  ) : null}
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </nav>
  );
}
