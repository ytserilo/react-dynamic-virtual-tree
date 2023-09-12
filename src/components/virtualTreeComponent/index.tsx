import React, { ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { getLevel } from "./layerComponent";
import { Layer, ListItem, VirtualTree } from "../../virtualTree";

export interface VirtualTreeState {
  layer: Layer;
  listItem: ListItem;
}

export interface VirtualTreeProviderProps {
  children: ReactNode;
  height: number;
  className?: string;
}

interface WrapperProps {
  children: ReactNode;
  virtualTree: VirtualTree;
  height: number;
  className?: string;
}

export const mergeVirtualTree = (prev: VirtualTreeState, next: VirtualTreeState, reInitTrigger: () => void) => {
  let stop = false;
  const merge = (prev: VirtualTreeState, next: VirtualTreeState, skip: boolean = false) => {
    if (stop) {
      return;
    }
    if (!skip) {
      const defaultHeight = prev.listItem.defaultHeight;
      next.listItem.height = prev.listItem.currentHeight === undefined ? defaultHeight : prev.listItem.currentHeight;
      next.listItem.defaultHeight = defaultHeight;
    }

    if (next.listItem.children.length === 0) {
      return;
    }

    const level = getLevel(prev.layer);
    const layers = prev.layer.getLayersByLevel(level + 1);

    const prevDefaultChildHeight = layers?.[0]?.listItem?.defaultHeight;

    if (prevDefaultChildHeight === undefined) {
      stop = true;
      reInitTrigger();
      return;
    }
    next.layer.children.forEach((childLayer) => {
      const prevChildLayer = prev.layer.children.find((item) => item.listItem.id === childLayer.listItem.id);
      if (!prevChildLayer) {
        childLayer.listItem.height = prevDefaultChildHeight;
        childLayer.listItem.defaultHeight = prevDefaultChildHeight;
        merge(
          {
            listItem: layers?.[0]?.listItem,
            layer: layers?.[0],
          },
          {
            listItem: childLayer.listItem,
            layer: childLayer,
          },
          true
        );
        return;
      }

      childLayer.listItem.memorizeState(prevChildLayer.listItem.getMemorizedState());
      merge(
        {
          listItem: prevChildLayer.listItem,
          layer: prevChildLayer,
        },
        {
          listItem: childLayer.listItem,
          layer: childLayer,
        }
      );
    });
  };

  merge(prev, next);

  return next;
};

export const Wrapper = ({ children, virtualTree, height: containerHeight, className }: WrapperProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number>(0);
  const containerHeightRef = useRef<number>(containerHeight);

  const handler = useCallback(() => {
    const block = ref.current;
    if (!block) {
      return;
    }

    virtualTree.pushOffset(virtualTree.getOffset(block.scrollTop, containerHeightRef.current, 20));
  }, []);

  useEffect(() => {
    if (containerHeightRef.current !== containerHeight) {
      containerHeightRef.current = containerHeight;
      handler();
    }
  }, [containerHeight]);

  useEffect(() => {
    const clearFunctions: Array<() => void> = [];

    const clear = virtualTree.onReady(() => {
      if (ref.current) {
        ref.current.addEventListener("scroll", handler);
        setHeight(virtualTree.getTotalHeight());
        handler();

        const clearOnUpdate = virtualTree.onUpdate(() => {
          setHeight(virtualTree.getTotalHeight());
          handler();
        });

        clearFunctions.push(clearOnUpdate);
      }
    });

    clearFunctions.push(clear);
    window.addEventListener("resize", handler);
    handler();

    return () => {
      clearFunctions.forEach((clear) => clear());
      window.removeEventListener("resize", handler);
      if (ref.current) {
        ref.current.removeEventListener("scroll", handler);
      }
    };
  }, []);

  return (
    <div
      ref={ref}
      style={{
        height: containerHeight,
        position: "relative",
        overflow: "auto",
        willChange: "transform",
        direction: "ltr",
        width: "100%",
      }}
    >
      <div style={{ height: height }} className={className}>
        {children}
      </div>
    </div>
  );
};
