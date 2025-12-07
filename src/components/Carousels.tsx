"use client";

import { Carousel } from "react-bootstrap";
import Image from "next/image";

function Carousels() {
  return (
    <div className="w-full h-full flex items-center justify-center">
      <div className="w-full h-full flex items-center justify-center">
        <div className="w-full h-full">
          <Carousel controls={false} interval={3000} pause={false} className="h-full w-full">
            <Carousel.Item className="h-full w-full">
              <div
                className="d-flex justify-content-center align-items-center h-100 w-100">
                <div className="relative w-full h-full flex items-center justify-center">
                  <Image
                    src="/DAKAPLUS.png"
                    alt="First slide"
                  height={550}
                  width={550}
                  objectFit="contain"
                  />
                </div>
              </div>
            </Carousel.Item>
            <Carousel.Item className="h-full w-full">
              <div
                className="d-flex justify-content-center align-items-center h-100 w-100"
              >
                <div className="relative w-full h-full flex items-center justify-center">
                  <Image
                    src="/DAKA.png"
                    alt="Second slide"
                  height={550}
                  width={550}
                  objectFit="contain"
                  />
                </div>
              </div>
            </Carousel.Item>
          </Carousel>
        </div>
      </div>
    </div>
  );
}

export default Carousels;
