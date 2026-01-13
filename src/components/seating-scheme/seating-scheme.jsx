import { forwardRef, useCallback, useEffect, useRef } from 'react';
import { TransformWrapper } from 'react-zoom-pan-pinch'
import './seating-scheme.scss'
import Controls from './controls'
import SvgScheme from './svg'

const SeatingScheme = forwardRef((props, ref) => {
  const svgRef = useRef(null);
  const reflowTimeoutRef = useRef(null);

  const forceSvgReflow = useCallback(() => {
    if (!svgRef.current) return;
    const svg = svgRef.current;

    svg.style.display = 'none';

    svg.getBoundingClientRect();

    svg.style.display = '';
  }, []);

  const debouncedReflow = useCallback(() => {
    if (reflowTimeoutRef.current) {
      clearTimeout(reflowTimeoutRef.current);
    }
    reflowTimeoutRef.current = setTimeout(forceSvgReflow, 150);
  }, [forceSvgReflow]);

  useEffect(() => {
    return () => {
      if (reflowTimeoutRef.current) {
        clearTimeout(reflowTimeoutRef.current);
      }
    }
  }, []);

  const { src, cart, categories, currency, tickets, toggleInCart, highlight, selectedCategory, resetSelectedCategory, viewport } = props

  return (
    <TransformWrapper
      minScale={0.8}
      maxScale={4}
      initialScale={1}
      doubleClick={{
        disabled: true
      }}

      onZoom={debouncedReflow}
    >
      <SvgScheme
        src={src}
        cart={cart}
        categories={categories}
        currency={currency}
        highlight={highlight}
        tickets={tickets}
        toggleInCart={toggleInCart}
        viewport={viewport}
        ref={svgRef}
      />
      <Controls
        selectedCategory={selectedCategory}
        resetCategory={resetSelectedCategory}
      />
    </TransformWrapper>
  )
})

export default SeatingScheme