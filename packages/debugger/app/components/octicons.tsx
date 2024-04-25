import * as Octicons from "@primer/octicons-react";
import React, { ComponentType } from "react";
import { IconProps } from "@primer/octicons-react";

interface IconByNameProps {
  iconName: string; // User input in kebab-case
  size?: number;
}

// Function to convert kebab-case to PascalCase + "Icon"
const convertToComponentName = (iconName: string): keyof typeof Octicons => {
  const pascalCase = iconName
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("");
  return `${pascalCase}Icon` as keyof typeof Octicons;
};

const IconByName: React.FC<IconByNameProps & IconProps> = ({
  iconName,
  size = 24,
  ...props
}) => {
  const componentName = convertToComponentName(iconName);
  const IconComponent = Octicons[componentName] as
    | ComponentType<IconProps>
    | undefined;
  if (!IconComponent) {
    return <p>Icon not found</p>;
  }
  return <IconComponent size={size} {...props} />;
};

export default IconByName;
