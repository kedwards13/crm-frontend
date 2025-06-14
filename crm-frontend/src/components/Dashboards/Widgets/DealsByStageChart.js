/** widgets/DealsByStageChart.js **/
import React from 'react';
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from 'recharts';

const data = [
  { name: 'Qualified', value: 40 },
  { name: 'Proposed', value: 30 },
  { name: 'Closed', value: 20 },
];

const COLORS = ['#0a84ff', '#5ac8fa', '#30d158']; // Apple-esque palette

const DealsByStageChart = () => {
  return (
    <ResponsiveContainer width="100%" height={250}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip contentStyle={{ backgroundColor: '#2c2c2e', border: 'none' }} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
};

export default DealsByStageChart;