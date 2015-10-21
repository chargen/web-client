import React, { Component } from 'react';
import { RouteHandler } from 'react-router';
import { connect } from 'react-redux';

import NavBar from 'components/NavBar';
import ToastManager from '../ToastManager';
import styles from './index.css';

@connect(
  (state) => ({user: state.currentUser})
)
export default class App extends Component {
  static propTypes = {
    user: React.PropTypes.object.isRequired,
  };

  render() {
    return (<div>
      <div className={styles.topLine}>
        <div className={styles.redLine}></div>
        <div className={styles.greenLine}></div>
        <div className={styles.blueLine}></div>
        <div className={styles.yellowLine}></div>
      </div>
      <ToastManager />
      <NavBar username={this.props.user.name} />
      <section className={styles.contenthost}>
        <RouteHandler />
      </section>
    </div>);
  }
}
