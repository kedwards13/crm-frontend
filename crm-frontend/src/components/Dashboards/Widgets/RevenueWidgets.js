/** widgets/RevenueChart.js **/
import React from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts';

const data = [
  { month: 'Jan', revenue: 30000 },
  { month: 'Feb', revenue: 45000 },
  { month: 'Mar', revenue: 50000 },
  { month: 'Apr', revenue: 60000 },
  { month: 'May', revenue: 75000 },
  { month: 'Jun', revenue: 90000 },
];

const RevenueChart = () => {
  return (
    <ResponsiveContainer width="100%" height={250}>
      <LineChart data={data} margin={{ top: 20, right: 10, left: -10, bottom: 0 }}>
        <CartesianGrid stroke="#444446" strokeDasharray="3 3" />
        <XAxis dataKey="month" stroke="#ccc" />
        <YAxis stroke="#ccc" />
        <Tooltip contentStyle={{ backgroundColor: '#2c2c2e', border: 'none' }} />
        <Line type="monotone" dataKey="revenue" stroke="#0a84ff" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default RevenueChart;