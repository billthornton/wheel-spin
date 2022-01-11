import React, { useState, useRef, useCallback, useEffect } from 'react';
import { IconDownload, IconTrash } from '@tabler/icons';
import { downloadAsPng, downloadAsSvgSlow } from './export';

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
        <Control title="Download as SVG" onClick={downloadAsSvgSlow()}>
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

interface SegmentEntry {
  title: string;
  index: number;
  fill: string;
  start: number;
  end: number;
}

interface SegmentProps {
  // eslint-disable-next-line no-unused-vars
  handleDeleteBtn: (event: any) => void;
  isWinner: boolean;
  // eslint-disable-next-line react/require-default-props
  finalRotation?: number | null;
  entry: SegmentEntry;
  center: number;
  radius: number;
  radiusWidth: number;
}

// Prevent it going off screen
const getAdjustedDeleteButtonRotation = (textRotation: number, wheelRotation: number): number => {
  const totalRotation = (textRotation + wheelRotation) % 360;

  console.log({ totalRotation, textRotation, wheelRotation });

  // This is some real confusing logic
  if (totalRotation >= 180 && totalRotation < 360 - 30) return 360 - 30 - wheelRotation;
  // '25' and other parts about this are just fudged until it works
  if (totalRotation > 45 && totalRotation < 180) return textRotation - (totalRotation - 25);

  return textRotation;
};

function Segment({
  handleDeleteBtn,
  isWinner,
  finalRotation = null,
  entry: { start, end, title, fill },
  center,
  radius,
  radiusWidth
}: SegmentProps) {
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

  const textRotation = start + (end - start) / 2;
  const deleteRotation = finalRotation !== null ? getAdjustedDeleteButtonRotation(textRotation, finalRotation) : 0;

  return (
    <g>
      <path d={path} style={{ fill, strokeWidth: '1', stroke: isWinner ? 'white' : 'none' }} />
      <g transform={`translate(${center}, ${center})`}>
        <g transform={`rotate(${textRotation})`}>
          <foreignObject x="64" y="-50" width={204 - 64} height="100">
            <div className="wheel__text">
              <span style={{ fontSize: getNaiveFontSize() }}>{title}</span>
            </div>
          </foreignObject>
        </g>
        {isWinner && (
          <g transform={`rotate(${deleteRotation})`}>
            <foreignObject x="244" y="-50" width={204 - 64} height="100">
              <div className="wheel__text">
                <button onClick={handleDeleteBtn} type="button" className="wheel__delete-btn">
                  <IconTrash size="58" />
                </button>
              </div>
            </foreignObject>
          </g>
        )}
      </g>
    </g>
  );
}

interface WheelProps {
  value: string;
  // eslint-disable-next-line no-unused-vars
  setValue: (newValue: string) => void;
  svgElementRef: React.MutableRefObject<SVGSVGElement | null>;
  // eslint-disable-next-line no-unused-vars
  onWheelChange: (isSpinning: boolean) => void;
  winner: SegmentEntry | null;
  // eslint-disable-next-line no-unused-vars
  setWinner: (segment: SegmentEntry | null) => void;
}

function Wheel({ value, setValue, svgElementRef, onWheelChange, winner, setWinner }: WheelProps) {
  const svgGroupRef = useRef<SVGSVGElement>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [finalRotation, setFinalRotation] = useState<number | null>(null);

  const rawLines = value
    .split('\n')
    .map((a) => a.trim())
    .filter((a) => !a.startsWith('#'))
    .filter(Boolean);

  const lines = rawLines;

  const segments = lines.length;
  const radius = 204;
  const radiusWidth = 32;
  const svgSize = 408;
  const center = svgSize / 2;
  const degrees = 360 / segments;

  const entries: SegmentEntry[] = lines.map((title, index) => {
    const start = degrees * index;
    const end = degrees * (index + 1);
    const fill = COLOURS[index % COLOURS.length];

    return { title, start, end, index, fill };
  });

  const entriesRef = useRef(entries);
  // const winnerRef = useRef(winner);
  useEffect(() => {
    entriesRef.current = entries;
    // winnerRef.current = winner;
  }, [entries, winner]);

  const onClick = useCallback(() => {
    const svgEl = svgGroupRef.current;

    if (svgEl && !isSpinning) {
      setIsSpinning(true);
      onWheelChange(true);
      setWinner(null);

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

        if (rotation > 360) rotation -= 360;

        if (speed > 0) {
          const adjustment = timeDiff / 8;

          const change = baseRotationPerStep * speed * adjustment;
          rotation += change;
          svgEl.style.transform = `rotate(${rotation.toFixed(2)}deg)`;
          window.requestAnimationFrame(step);
        } else {
          clearInterval(decelerationInterval);
          setIsSpinning(false);
          onWheelChange(false);
          const adjustedRotation = 360 - rotation;
          // TODO: Need to verify how this works at the boundaries!!!
          const winningEntry = entriesRef.current.find(
            ({ start, end }) => adjustedRotation >= start && adjustedRotation < end
          );

          console.log({ adjustedRotation, rotation, winningEntry, e: entriesRef.current });

          if (!winningEntry) {
            console.error('Failed to determine winner!');
          } else {
            setWinner(winningEntry);
            setFinalRotation(rotation); // or is it adjusted rotation?
          }
        }
      };

      window.requestAnimationFrame(step);
    }
  }, [isSpinning, onWheelChange, setFinalRotation, setWinner]);

  if (lines.length < 2) return null;

  const pointSize = 16;

  const nonWinningEntries = entries.filter((entry) => winner?.index !== entry.index);

  const handleDeleteBtn = (entry: SegmentEntry) => (e: any) => {
    e.preventDefault();
    e.stopPropagation();

    setWinner(null);
    const newValue = value
      .split('\n')
      .map((a) => a.trim())
      .filter((a) => a !== entry.title)
      .join('\n');
    setValue(newValue);
  };

  return (
    <div className="wheel-wrapper" style={{ cursor: isSpinning ? 'wait' : 'grab' }}>
      <svg
        className="wheel"
        onClick={onClick}
        ref={svgElementRef}
        height={svgSize}
        width={svgSize}
        viewBox={`0 0 ${svgSize * 1.75} ${svgSize}`}
      >
        <g className="wheel__circle-container" transform="translate(150, 0)">
          <g className="wheel__circle" ref={svgGroupRef}>
            {nonWinningEntries.map((entry) => (
              // console.log({ isWinner: winner?.index === entry?.index, winner, entry });
              <Segment
                handleDeleteBtn={handleDeleteBtn(entry)}
                isWinner={false}
                key={entry.index}
                entry={entry}
                center={center}
                radius={radius}
                radiusWidth={radiusWidth}
              />
            ))}
            {winner && (
              <Segment
                handleDeleteBtn={handleDeleteBtn(winner)}
                isWinner
                finalRotation={finalRotation}
                key={winner.index}
                entry={winner}
                center={center}
                radius={radius + 10}
                radiusWidth={radiusWidth}
              />
            )}
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
        </g>
      </svg>
    </div>
  );
}

function Sidebar({
  value,
  onChange,
  isOpen,
  handleClick
}: {
  value: string;
  onChange: any;
  isOpen: boolean;
  // eslint-disable-next-line no-unused-vars
  handleClick: (e: unknown) => void;
}) {
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
    <details className="sidebar" open={isOpen} onToggle={handleToggle}>
      <textarea ref={textAreaRef} className="" value={value} onChange={handleChange} />

      <summary onClick={handleClick}>
        <b className="summary-text">&#10095;</b>
      </summary>
    </details>
  );
}

function App() {
  const valueFromParams = new URLSearchParams(document.location.search).get('input');
  const decodedValueFromParams = valueFromParams && atob(valueFromParams);
  const [value, setValue] = useState(decodedValueFromParams || initValue);
  const [winner, setWinner] = useState<SegmentEntry | null>(null);

  const svgElementRef = useRef<SVGSVGElement | null>(null);
  const [sidebarOpen, setSidebarOpenState] = useState(true);

  const updateWithNewValue = (newValue: string) => {
    const searchParams = new URLSearchParams(document.location.search);
    searchParams.set('input', btoa(newValue));
    const newRelativePathQuery = `${window.location.pathname}?${searchParams.toString()}`;
    window.history.pushState(null, '', newRelativePathQuery);
    setValue(newValue);
    setWinner(null);
  };

  const onSidebarClick = (e: any) => {
    e.preventDefault();
    setSidebarOpenState(!sidebarOpen);
  };

  const onWheelChange = (isSpinning: boolean) => {
    if (isSpinning) {
      setSidebarOpenState(false);
    }
  };

  return (
    <>
      <Sidebar isOpen={sidebarOpen} handleClick={onSidebarClick} value={value} onChange={updateWithNewValue} />
      <Wheel
        onWheelChange={onWheelChange}
        value={value}
        setValue={updateWithNewValue}
        svgElementRef={svgElementRef}
        winner={winner}
        setWinner={setWinner}
      />
      <Controls />
    </>
  );
}

export default App;
