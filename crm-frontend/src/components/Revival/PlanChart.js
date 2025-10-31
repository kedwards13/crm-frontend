import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const dummyData = [
  { month: 'Jan', value: 2300 },
  { month: 'Feb', value: 3200 },
  { month: 'Mar', value: 4100 },
  { month: 'Apr', value: 3800 },
  { month: 'May', value: 4700 },
  { month: 'Jun', value: 5500 },
];

const PlanChart = () => {
  return (
    <div style={{ width: '100%', height: 280 }}>
      <ResponsiveContainer>
        <LineChart data={dummyData}>
          <XAxis dataKey="month" stroke="#888" />
          <YAxis stroke="#888" />
          <Tooltip />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#4f8df9"
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PlanChart;