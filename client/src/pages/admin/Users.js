// Leong Soon Mun Stephane, A0273409B
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from '../../components/Layout';
import AdminMenu from '../../components/AdminMenu';

const Users = () => {
  const [users, setUsers] = useState([]); // Leong Soon Mun Stephane, A0273409B

  const getAllUsers = async () => { // Leong Soon Mun Stephane, A0273409B
    try {
      const { data } = await axios.get("/api/v1/auth/all-users");
      setUsers(data);
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => { // Leong Soon Mun Stephane, A0273409B
    getAllUsers();
  }, []);
  return (
    <Layout title={"Dashboard - All Users"}>
      <div className="container-fluid m-3 p-3">
        <div className="row">
          <div className="col-md-3">
            <AdminMenu />
          </div>
          <div className="col-md-9">
            <h1>All Users</h1>
            {/* Leong Soon Mun Stephane, A0273409B */}
            <div className="table-responsive border shadow">
              <table className="table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Address</th>
                    <th>Role</th>
                  </tr>
                </thead>
                <tbody>
                  {users?.map((user) => (
                    <tr key={user._id}>
                      <td>{user.name}</td>
                      <td>{user.email}</td>
                      <td>{user.phone}</td>
                      <td>{user.address}</td>
                      <td>{user.role === 1 ? "Admin" : "User"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Leong Soon Mun Stephane, A0273409B */}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Users;