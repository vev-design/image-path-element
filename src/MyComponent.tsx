import { registerVevComponent, SchemaFieldProps, useFrame } from "@vev/react";
import { SilkeButton, SilkeModal } from "@vev/silke";
import React, { useLayoutEffect, useRef, useState } from "react";
import {
  useCleanPath,
  useCurveControlPoints,
  useSvgPath,
} from "./bezier-curve";
import styles from "./MyComponent.module.css";

type Props = {
  image: { url: string };
  width: number;
  path: { x: number; y: number }[];
  hostRef: React.RefObject<HTMLDivElement>;
};

const MyComponent = ({ image, width, path, hostRef }: Props) => {
  const ref = useRef<HTMLImageElement>();
  const cleanPath = useCleanPath(path);
  const [firstControlPoints, secondControlPoints] =
    useCurveControlPoints(cleanPath);

  useLayoutEffect(() => {
    const maxMovePrSec = 40;
    let lastX: number;
    let lastUpdate = 0;
    let animationRequestId: number;

    const handleUpdate = () => {
      cancelAnimationFrame(animationRequestId);
      const img = ref.current;
      if (!path && !img) return;
      const { top, height, width } = img.getBoundingClientRect();
      const scrollTop = document.scrollingElement.scrollTop;
      const scrollHeight = document.scrollingElement.scrollHeight;

      let offsetEnd = 0;
      const offsetBottom = scrollTop + top + height;
      const maxTopPos = scrollHeight - window.innerHeight / 2;
      const elementBottom = top + scrollTop + height;
      offsetEnd = Math.max(0, elementBottom - maxTopPos);

      const percent = Math.max(
        0,
        Math.min(1, (-1 * top + window.innerHeight / 2) / (height - offsetEnd))
      );

      let i = 0;
      let xPercent = cleanPath[0].x;
      while (cleanPath[i] && cleanPath[i].y < percent) i++;

      if (i >= 1) {
        i = Math.min(i, cleanPath.length - 1);
        let p0Index = Math.max(0, i - 1);

        const { x: x0, y: y0 } = cleanPath[p0Index];
        const { x: x1 } = firstControlPoints[p0Index];
        const { x: x2 } = secondControlPoints[p0Index];
        const { x: x3, y: y3 } = cleanPath[i];
        // Percent traveled between closest before and after point
        const t = Math.max(0, Math.min(1, (percent - y0) / (y3 - y0)));
        /// Cubic bezier formula https://en.wikipedia.org/wiki/B%C3%A9zier_curve#Quadratic_curves
        xPercent =
          Math.pow(1 - t, 3) * x0 +
          3 * Math.pow(1 - t, 2) * t * x1 +
          3 * (1 - t) * Math.pow(t, 2) * x2 +
          Math.pow(t, 3) * x3;
      }

      let desiredX = xPercent * width;

      const time = performance.now();
      const deltaTime = time - lastUpdate;
      let x = lastX + (desiredX - lastX) / 10;
      if (lastX === undefined) x = desiredX;
      lastUpdate = time;
      lastX = x;

      const winWidth = window.innerWidth / 2;
      img.style.transform = `translateX(${winWidth - x}px)`;

      if (Math.abs(desiredX - x) > 1) {
        animationRequestId = requestAnimationFrame(handleUpdate);
        // console.log("update", desiredX, x);
      }
    };

    window.addEventListener("scroll", handleUpdate);
    window.addEventListener("resize", handleUpdate);
    handleUpdate();
    return () => {
      cancelAnimationFrame(animationRequestId);
      window.removeEventListener("scroll", handleUpdate);
      window.removeEventListener("resize", handleUpdate);
    };
  }, [path]);
  return (
    <div className={styles.wrapper}>
      <img
        className={styles.img}
        ref={ref}
        src={image?.url}
        style={{
          height: "100%",
        }}
      />
    </div>
  );
};

registerVevComponent(MyComponent, {
  name: "Image path",
  type: "section",
  props: [
    { name: "image", type: "image" },
    {
      name: "path",
      type: "array",
      of: [
        {
          type: "object",
          name: "Point",
          fields: [
            { name: "x", type: "number" },
            { name: "y", type: "number" },
          ],
        },
      ],

      component: ImagePathField,
    },
  ],
  editableCSS: [
    {
      selector: styles.wrapper,
      properties: ["background"],
    },
  ],
});

export default MyComponent;

function ImagePathField({ context, value, onChange }: SchemaFieldProps<any>) {
  const cleanPath = useCleanPath(value);
  const image = context.value?.image;
  const path = value || [];
  const [edit, setEdit] = useState(false);
  const svgPath = useSvgPath(cleanPath);

  const handleAdd = (e: React.MouseEvent) => {
    const { top, left, width, height } =
      e.currentTarget.getBoundingClientRect();
    const percentX = (e.pageX - left) / width;
    const percentY = (e.pageY - top) / height;
    onChange([...path, { x: percentX, y: percentY }].sort((a, b) => a.y - b.y));
  };

  return (
    <>
      <SilkeButton
        kind="ghost"
        label="Edit path"
        icon="edit"
        onClick={() => setEdit(!edit)}
      />
      {edit && (
        <SilkeModal>
          <div
            style={{ position: "relative", width: "min(90vw, 1200px)" }}
            onClick={handleAdd}
          >
            <img src={image?.url} />
            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                vectorEffect: "non-scaling-stroke",
              }}
            >
              <path
                fill="none"
                stroke="red"
                strokeWidth={3}
                style={{ vectorEffect: "non-scaling-stroke" }}
                d={svgPath}
              />
            </svg>
            {path.map((point, i) => (
              <div
                key={i}
                onClick={(e) => {
                  e.stopPropagation();
                  const newPath = [...path];
                  newPath.splice(i, 1);
                  onChange(newPath);
                }}
                style={{
                  position: "absolute",
                  top: point.y * 100 + "%",
                  left: point.x * 100 + "%",
                  transform: "translate(-50%, -50%)",
                  width: 10,
                  height: 10,
                  background: "red",
                  borderRadius: "50%",
                }}
              />
            ))}
          </div>
        </SilkeModal>
      )}
    </>
  );
}
