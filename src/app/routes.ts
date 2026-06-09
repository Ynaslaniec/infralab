import { createBrowserRouter } from 'react-router';
import React from 'react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Equipment from './pages/Equipment';
import EquipmentSchedule from './pages/EquipmentSchedule';
import Labs from './pages/Labs';
import LabSchedule from './pages/LabSchedule';
import Report from './pages/Report';
import Appointments from './pages/Appointments';
import Tickets from './pages/Tickets';
import TicketChat from './pages/TicketChat';
import Notifications from './pages/Notifications';
import Profile from './pages/Profile';
import RegisterUser from './pages/RegisterUser';
import Infrastructure from './pages/Infrastructure';
import Spaces from './pages/Spaces';
import SpaceSchedule from './pages/SpaceSchedule';
import Layout from './Layout';
import { RoleRoute } from './components/ProtectedRoute';

// Cria um wrapper que passa o path para RoleRoute
function guard(path: string, Component: React.ComponentType) {
  return () =>
    React.createElement(
      RoleRoute,
      { path },
      React.createElement(Component),
    );
}

export const router = createBrowserRouter([
  { path: '/', Component: Login },
  {
    path: '/',
    Component: Layout,
    children: [
      { path: 'dashboard',              Component: guard('/dashboard',             Dashboard) },
      { path: 'equipment',              Component: guard('/equipment',             Equipment) },
      { path: 'equipment/:id/schedule', Component: guard('/equipment',             EquipmentSchedule) },
      { path: 'labs',                   Component: guard('/labs',                  Labs) },
      { path: 'labs/:id/schedule',      Component: guard('/labs',                  LabSchedule) },
      { path: 'report',                 Component: guard('/report',                Report) },
      { path: 'appointments',           Component: guard('/appointments',          Appointments) },
      { path: 'tickets',                Component: guard('/tickets',               Tickets) },
      { path: 'tickets/:id/chat',       Component: guard('/tickets',               TicketChat) },
      { path: 'notifications',          Component: guard('/notifications',         Notifications) },
      { path: 'profile',                Component: guard('/profile',               Profile) },
      { path: 'users',                  Component: guard('/users',                 RegisterUser) },
      { path: 'infrastructure',         Component: guard('/infrastructure',        Infrastructure) },
      { path: 'spaces',                 Component: guard('/spaces',                Spaces) },
      { path: 'spaces/:kind/:id/schedule', Component: guard('/spaces',             SpaceSchedule) },
    ],
  },
]);
