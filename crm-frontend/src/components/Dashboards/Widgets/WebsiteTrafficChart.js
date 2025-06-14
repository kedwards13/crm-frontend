/** widgets/WebsiteTrafficChart.js **/
import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const trafficData = [
  { day: 'Mon', visits: 200 },
  { day: 'Tue', visits: 300 },
  { day: 'Wed', visits: 500 },
  { day: 'Thu', visits: 400 },
  { day: 'Fri', visits: 600 },
  { day: 'Sat', visits: 700 },
  { day: 'Sun', visits: 650 },
];

const WebsiteTrafficChart = () => {
  return (
    <ResponsiveContainer width="100%" height={250}>
      <AreaChart data={trafficData} margin={{ top: 20, right: 10, left: -10, bottom: 0 }}>
        <defs>
          <linearGradient id="colorVisits" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#0a84ff" stopOpacity={0.8} />
            <stop offset="95%" stopColor="#0a84ff" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="#444446" strokeDasharray="3 3" />
        <XAxis dataKey="day" stroke="#ccc" />
        <YAxis stroke="#ccc" />
        <Tooltip contentStyle={{ backgroundColor: '#2c2c2e', border: 'none' }} />
        <Area
          type="monotone"
          dataKey="visits"
          stroke="#0a84ff"
          fillOpacity={1}
          fill="url(#colorVisits)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};

export default WebsiteTrafficChart;