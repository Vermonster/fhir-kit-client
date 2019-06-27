import React, { Component } from 'react';
import Client from 'fhir-kit-client';
import JSONPretty from 'react-json-pretty';
import 'react-json-pretty/themes/monikai.css';

class App extends Component {

  state = {
    patientData: null
  }

  async componentDidMount() {
    
    const baseUrl = "https://r4.smarthealthit.org";
    const patientId = "62acbbe9-7bae-4d33-b53f-a389c1a0e281";
    const client = new Client({ baseUrl });
    
    const response = await client.read({ resourceType: 'Patient', id: patientId });
  
    // const stringified = JSON.stringify(data);
    this.setState({ patientData: response });
  }

  render() {
    console.log(this.state.patientData);
    return (
      <div>
        <p style={{ textAlign: "center" }}>Below, the app fetches a patient's data on <code>componentDidMount()</code></p>
        {
          this.state.patientData ?
          <JSONPretty data={ JSON.stringify(this.state.patientData)}></JSONPretty> :
          <div>No patient data</div>
        }
      </div>
    );
  }
}
  

export default App;
