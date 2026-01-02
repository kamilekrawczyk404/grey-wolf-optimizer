import React, { ReactNode } from "react";

type ItemsCarouselProps<T> = {
  items: T[];
  onIndexChange: (index: number) => void;
  renderItem: (item: T, index: number) => ReactNode;
  className?: string;
};

const ItemsCarousel = <T extends unknown>({
  items,
  onIndexChange,
  renderItem,
  className = "",
}: ItemsCarouselProps<T>) => {
  return (
    <ul className={`no-scroll overflow-x-scroll flex ${className}`}>
      {items.map((item, index) => (
        <li key={index} onClick={() => onIndexChange(index)}>
          {renderItem(item, index)}
        </li>
      ))}
    </ul>
  );
};

export default ItemsCarousel;
