import React, { useState, useRef } from 'react';
import { IconDownload } from '@tabler/icons';
import { downloadAsPng, downloadAsSvg } from './export';

import './App.css';

const initValue = `one
two
three
four
five
six
`;

function Control({
  children,
  onClick,
  title
}: {
  children: React.ReactChild | React.ReactChild[];
  onClick: () => void;
  title: string;
}) {
  return (
    <button type="button" title={title} onClick={onClick} className="controls__button">
      {children}
    </button>
  );
}

function Controls() {
  return (
    <ul className="controls">
      <li>
        <Control title="Download as SVG" onClick={downloadAsSvg}>
          <IconDownload size="18" /> <span className="control__button-text">SVG</span>
        </Control>
      </li>
      <li>
        <Control title="Download as PNG" onClick={downloadAsPng()}>
          <IconDownload size="18" /> <span className="control__button-text">PNG</span>
        </Control>
      </li>
    </ul>
  );
}

const polarToCartesian = (x: number, y: number, r: number, degrees: number): [number, number] => {
  const radians = (degrees * Math.PI) / 180.0;
  return [x + r * Math.cos(radians), y + r * Math.sin(radians)];
};

interface SegmentEntry {
  title: string;
  index: number;
  fill: string;
  start: number;
  end: number;
}

interface SegmentProps {
  entry: SegmentEntry;
  center: number;
  radius: number;
  radiusWidth: number;
}

// const COLOURS = ['red', 'yellow', 'grey', 'blue', 'indigo', 'green', 'black'];
const COLOURS = [
  '#540d6e',
  '#ee4266',
  '#ffd23f',
  '#3bceac',
  '#0ead69',
  '#faa275',
  '#ff8c61',
  '#ce6a85',
  '#985277',
  '#5c374c',
  '#fa7921',
  '#fe9920',
  '#b9a44c',
  '#566e3d',
  '#0c4767'
];

function Segment({ entry: { start, end, title, fill }, center, radius, radiusWidth }: SegmentProps) {
  // https://svgwg.org/specs/paths/#PathDataEllipticalArcCommands
  const arc = Math.abs(start - end) > 180 ? 1 : 0;

  const point = (r: number, degree: number) =>
    polarToCartesian(center, center, r, degree)
      .map((n) => n.toFixed(2))
      .join(',');

  const path = [
    `M${point(radius, start)}`,
    `A${radius},${radius},0,${arc},1,${point(radius, end)}`,
    `L${point(radiusWidth, end)}`,
    `A${radiusWidth},${radiusWidth},0,${arc},0,${point(radiusWidth, start)}`,
    'Z'
  ].join('');

  const getNaiveFontSize = (): string => {
    const chars = title.length;
    if (chars < 8) return '32px';
    if (chars < 12) return '20px';
    if (chars < 18) return '18px';
    if (chars < 24) return '16px';
    return '14px';
  };

  return (
    <g>
      <path d={path} style={{ fill, stroke: 'none' }} />
      <g transform={`translate(${center}, ${center})`}>
        <g transform={`rotate(${start + (end - start) / 2})`}>
          <foreignObject x="64" y="-50" width={204 - 64} height="100">
            <div className="wheel__text">
              <span style={{ fontSize: getNaiveFontSize() }}>{title}</span>
            </div>
          </foreignObject>
        </g>
      </g>
    </g>
  );
}

// not needed anymore if we control the rotation
// const getRotation = (element: HTMLElement | SVGElement): number => {
//   const styles = window.getComputedStyle(element, null);
//   const matrixTransform = styles.getPropertyValue('transform');

//   const match = matrixTransform.match(/matrix\((?<a>[^,]+), (?<b>[^,]+), .+\)/);

//   if (!match?.groups) {
//     throw new Error(`failed to parse matrix(): ${matrixTransform}`);
//   }
//   const { a, b } = match.groups;

//   const angle = Math.round(Math.atan2(parseFloat(b), parseFloat(a)) * (180 / Math.PI));

//   return angle;
// };

function Wheel({
  value,
  svgElementRef
}: {
  value: string;
  svgElementRef: React.MutableRefObject<SVGSVGElement | null>;
}) {
  const svgGroupRef = useRef<SVGSVGElement>(null);

  const rawLines = value
    .split('\n')
    .map((a) => a.trim())
    .filter((a) => !a.startsWith('#'))
    .filter(Boolean);

  const lines = rawLines;

  if (lines.length < 2) return null;

  const segments = lines.length;
  const radius = 204;
  const radiusWidth = 32;
  const svgSize = 408;
  const center = svgSize / 2;
  const degrees = 360 / segments;

  const entries: SegmentEntry[] = lines.map((title, index) => {
    const start = degrees * index;
    const end = degrees * (index + 1);
    const fill = COLOURS[index];

    return { title, start, end, index, fill };
  });

  const onClick = () => {
    const svgEl = svgGroupRef.current;

    if (svgEl) {
      const intervalStep = 1.05;
      let rotation = Math.floor(Math.random() * 359);
      let interval = 0.005;
      let speed = 1;

      const baseRotationPerStep = 12;

      const decelerationInterval = setInterval(() => {
        interval = Math.min(interval * intervalStep, 0.8);
        speed -= interval;
      }, 100);

      let previousTimeStamp: number;

      const step = (timestamp: number) => {
        const timeDiff = timestamp - previousTimeStamp;
        previousTimeStamp = timestamp;

        if (Number.isNaN(timeDiff)) {
          window.requestAnimationFrame(step);
          return;
        }

        const adjustment = timeDiff / 8;

        const change = baseRotationPerStep * speed * adjustment;
        rotation += change;
        if (rotation > 360) rotation -= 360;
        if (speed > 0) {
          svgEl.style.transform = `rotate(${rotation.toFixed(2)}deg)`;
          window.requestAnimationFrame(step);
        } else {
          clearInterval(decelerationInterval);
          const adjustedRotation = 360 - rotation;
          // TODO: Need to verify how this works at the boundaries!!!
          const winner = entries.find(({ start, end }) => adjustedRotation >= start && adjustedRotation < end);

          if (winner) {
            // eslint-disable-next-line no-alert
            alert(winner.title);
          } else {
            // eslint-disable-next-line no-alert
            alert('No winner found!');
          }
        }
      };

      window.requestAnimationFrame(step);
    }
  };

  const pointSize = 16;

  return (
    <div className="wheel-wrapper">
      <svg
        className="wheel"
        onClick={onClick}
        ref={svgElementRef}
        height={svgSize}
        width={svgSize}
        viewBox={`0 0 ${svgSize} ${svgSize}`}
      >
        <g className="wheel__circle" ref={svgGroupRef}>
          {entries.map((entry) => (
            <Segment key={entry.title} entry={entry} center={center} radius={radius} radiusWidth={radiusWidth} />
          ))}
        </g>
        <g transform={`translate(${center}, ${center})`}>
          <circle r={radiusWidth} fill="pink" />
          <g className="wheel__pointer">
            <rect
              x={radiusWidth / 2}
              y={-radiusWidth / 2 + pointSize / 2}
              width={pointSize}
              height={pointSize}
              fill="pink"
            />
          </g>
        </g>
      </svg>
    </div>
  );
}

function Sidebar({ value, onChange }: { value: string; onChange: any }) {
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  const handleChange = (e: any) => {
    onChange(e.target.value);
  };

  const handleToggle = (e: any) => {
    if (e?.target?.open && textAreaRef.current) {
      textAreaRef.current.focus();
    }
  };

  return (
    <details className="sidebar" open onToggle={handleToggle}>
      <textarea ref={textAreaRef} className="" value={value} onChange={handleChange} />

      <summary>
        <b className="summary-text">&#10095;</b>
      </summary>
    </details>
  );
}

function App() {
  const valueFromParams = new URLSearchParams(document.location.search).get('input');
  const decodedValueFromParams = valueFromParams && atob(valueFromParams);
  const [value, setValue] = useState(decodedValueFromParams || initValue);

  const svgElementRef = useRef<SVGSVGElement | null>(null);

  const updateWithNewValue = (newValue: string) => {
    const searchParams = new URLSearchParams(document.location.search);
    searchParams.set('input', btoa(newValue));
    const newRelativePathQuery = `${window.location.pathname}?${searchParams.toString()}`;
    window.history.pushState(null, '', newRelativePathQuery);
    setValue(newValue);
  };

  return (
    <>
      <Sidebar value={value} onChange={updateWithNewValue} />
      <Wheel value={value} svgElementRef={svgElementRef} />
      <Controls />
    </>
  );
}

export default App;
