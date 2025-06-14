import React from 'react';
import Slider from 'react-slick';
import RevenueChartWidget from './RevenueChartWidget';
import ProfitChartWidget from './ProfitChartWidget';
import CustomerCountChartWidget from './CustomerCountChartWidget';
import './FinancialWidget.css';

import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

const FinancialWidget = () => {
  const settings = {
    dots: true,
    infinite: true,
    speed: 800,
    slidesToShow: 1,
    slidesToScroll: 1,
    swipe: true,
    arrows: false,
    autoplay: true,
    autoplaySpeed: 5000,
    fade: false,
    adaptiveHeight: true,
  };

  return (
    <div className="financial-widget widget card no-bg">
      <Slider {...settings}>
        <div className="financial-slide">
          <div className="slide-content">
            <RevenueChartWidget />
          </div>
        </div>
        <div className="financial-slide">
          <div className="slide-content">
            <ProfitChartWidget />
          </div>
        </div>
        <div className="financial-slide">
          <div className="slide-content">
            <CustomerCountChartWidget />
          </div>
        </div>
      </Slider>
    </div>
  );
};

export default FinancialWidget;