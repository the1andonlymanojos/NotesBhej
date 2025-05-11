"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/esm/Page/AnnotationLayer.css'
import 'react-pdf/dist/esm/Page/TextLayer.css'

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.mjs`;

interface PDFViewerComponentProps {
  file: string
}

export default function PDFViewerComponent({ file }: PDFViewerComponentProps) {
  const [numPages, setNumPages] = useState<number | null>(null)
  const [pageNumber, setPageNumber] = useState(1)
  const [scale, setScale] = useState(1.0)
  const [isMobile, setIsMobile] = useState(false)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // Check if device is mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Extract filename from URL
  const filename = file.split('/').pop() || ''

  // Load saved scroll position and scale
  useEffect(() => {
    const savedData = localStorage.getItem(`pdf-viewer-${filename}`)
    if (savedData) {
      const { scrollPosition, savedScale } = JSON.parse(savedData)
      setScale(savedScale)
      // Wait for the PDF to load before restoring scroll
      setTimeout(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = scrollPosition
        }
      }, 1000)
    } else {
      // Reset to default scale if no saved data
      setScale(1.0)
    }
  }, [filename]) // Add filename as dependency to reload when file changes

  // Save scroll position and scale
  const saveScrollPosition = useCallback(() => {
    if (scrollContainerRef.current) {
      const scrollPosition = scrollContainerRef.current.scrollTop
      localStorage.setItem(`pdf-viewer-${filename}`, JSON.stringify({
        scrollPosition,
        savedScale: scale
      }))
    }
  }, [filename, scale])

  // Save on scroll and scale change
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    let scrollTimeout: NodeJS.Timeout
    const handleScroll = () => {
      // Debounce the save operation
      clearTimeout(scrollTimeout)
      scrollTimeout = setTimeout(saveScrollPosition, 1000)
    }

    container.addEventListener('scroll', handleScroll)
    return () => {
      container.removeEventListener('scroll', handleScroll)
      clearTimeout(scrollTimeout)
    }
  }, [filename, scale, saveScrollPosition])

  // Save when scale changes
  useEffect(() => {
    saveScrollPosition()
  }, [scale, saveScrollPosition])

  function onDocumentLoadSuccess({ numPages: loadedNumPages }: { numPages: number }) {
    setNumPages(loadedNumPages)
    setPageNumber(1)
  }

  function onDocumentLoadError(error: Error) {
    console.error('Error while loading PDF:', error);
    // Optionally, set an error state here to display a message to the user
  }

  useEffect(() => {
    if (!numPages || !scrollContainerRef.current) {
      return; // Guard: no pages or scroll container not yet available
    }

    const options = {
      root: scrollContainerRef.current,
      rootMargin: '0px',
      threshold: 0.4, // Page is considered "current" if 40% is visible
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const targetElement = entry.target as HTMLElement;
          const pageNumStr = targetElement.dataset.pageNumber;
          if (pageNumStr) {
            const newPageNum = parseInt(pageNumStr, 10);
            setPageNumber(newPageNum); // Update state for display
            console.log(`Current page in view: ${newPageNum}`);
          }
        }
      });
    }, options);

    const pageElements = scrollContainerRef.current.querySelectorAll('.pdf-page-container');
    pageElements.forEach(el => observer.observe(el));

    return () => {
      pageElements.forEach(el => observer.unobserve(el));
      observer.disconnect();
    };
  }, [numPages, scale, file]); // Rerun if numPages, scale, or file changes

  return (
    <div className="flex flex-col h-full">
      {isMobile ? (
        <iframe
          src={file}
          className="w-full h-full"
          title="PDF Viewer"
        />
      ) : (
        <>
          <div ref={scrollContainerRef} className="flex-1 overflow-auto p-4 bg-zinc-100 dark:bg-zinc-900">
            <Document
              file={file}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              loading={
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                </div>
              }
            >
              {numPages && Array.from(new Array(numPages), (_, index) => (
                <div
                  key={`page_wrapper_${index + 1}`}
                  data-page-number={index + 1}
                  className="pdf-page-container mb-4 flex justify-center"
                >
                  <Page
                    pageNumber={index + 1}
                    scale={scale}
                    renderTextLayer={true}
                    renderAnnotationLayer={true}
                    className="shadow-lg"
                  />
                </div>
              ))}
            </Document>
          </div>
          <div className="flex items-center justify-between p-4 border-t border-zinc-200 dark:border-zinc-700 bg-white/50 dark:bg-zinc-800/50">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setScale(prev => Math.max(0.5, prev - 0.1))}
                disabled={scale <= 0.5}
              >
                -
              </Button>
              <span className="text-sm text-zinc-600 dark:text-zinc-400">
                {Math.round(scale * 100)}%
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setScale(prev => Math.min(2, prev + 0.1))}
                disabled={scale >= 2}
              >
                +
              </Button>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-zinc-600 dark:text-zinc-400">
                Page {pageNumber} of {numPages || '--'}
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  )
} 