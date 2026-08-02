/* eslint-disable @next/next/no-img-element -- This public SVG intentionally bypasses Next's image pipeline because Turbopack panics while resolving its metadata during HMR. */

import type { ImgHTMLAttributes } from "react";

const MUNICIPAL_LOGO_PATH = "/brand/logo-municipalidad.svg";

type MunicipalLogoProps = Omit<
  ImgHTMLAttributes<HTMLImageElement>,
  "alt" | "loading" | "src"
> & {
  alt: string;
};

export function MunicipalLogo({ alt, ...props }: MunicipalLogoProps) {
  return (
    <img
      {...props}
      alt={alt}
      loading="eager"
      src={MUNICIPAL_LOGO_PATH}
    />
  );
}
