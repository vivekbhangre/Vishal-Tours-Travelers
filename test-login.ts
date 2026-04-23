import axios from 'axios';

async function testLogin() {
  try {
    const res = await axios.post('http://localhost:3000/api/auth/login', {
      email: 'admin@example.com',
      password: 'password'
    });
    console.log("Success:", res.data);
  } catch (err: any) {
    if (err.response) {
      console.log("Error:", err.response.status, err.response.data);
    } else {
      console.log("Error:", err.message);
    }
  }
}
testLogin();
