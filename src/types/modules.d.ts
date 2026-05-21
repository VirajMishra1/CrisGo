declare module "react-leaflet-markercluster" {
  import { FC } from "react";

  interface MarkerClusterGroupProps {
    children?: React.ReactNode;
    [key: string]: any;
  }

  const MarkerClusterGroup: FC<MarkerClusterGroupProps>;
  export default MarkerClusterGroup;
}

declare module "react-leaflet-markercluster/styles" {}

declare module "leaflet.heat" {}
