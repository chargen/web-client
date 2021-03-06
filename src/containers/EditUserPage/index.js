import React, { Component, PropTypes } from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import cx from 'classnames';
import validator from 'validator';

import Modal from 'components/Modal';
import WhiteFooter from 'components/WhiteFooter';
import ActionButton from 'components/ActionButton';
import ActionButtonForModal from 'components/ActionButtonForModal';
import { isUnique } from 'api/users.js';
import Dropdown from 'components/Dropdown';
import FormInput from 'components/Form/FormInput';
import Header from 'components/Header';
import * as actions from 'actions/users.js';
import loading from 'decorators/loading';
import Footer from 'components/Footer';

import commonStyles from 'common/styles.css';
import styles from './index.css';

@connect(
  (state) => ({user: state.user.entity, currentUser: state.currentUser, loading: state.user.loading, userError: state.clientError }),
  (dispatch) => bindActionCreators(actions, dispatch)
)
@loading(
  (state) => state.user.loading,
  {isLoadingByDefault: true}
)
export default class EditUserPage extends Component {
  static propTypes = {
    params: PropTypes.shape({
      id: PropTypes.string,
    }),
    user: PropTypes.object,
  };

  static contextTypes = {
    router: PropTypes.func.isRequired,
  };

  constructor(props) {
    super(props);
    if (props.currentUser.type !== 'admin') {
      window.location.href = '/admin/libraries';
    }
    this.linkState = React.addons.LinkedStateMixin.linkState.bind(this);
    this.state = {
      loading: true,
      user: {},
      checked: {},
      errors: {
        name: [],
        login: [],
        password: [],
        confirm: [],
        email: [],
        phone: [],
      },
    };
    if (props.params.id) {
      props.loadUser(props.params.id);
    } else {
      props.newUser();
      this.state.user.type = 'admin';
    }
    this.types = [{
      value: 'admin',
      label: 'Admin',
    }, {
      value: 'operator',
      label: 'Operator',
    }, {
      value: 'mobile',
      label: 'Mobile',
    }, {
      value: 'owner',
      label: 'Owner (Super Admin)',
    }];
  }

  componentWillReceiveProps(props) {
    if (props.params.id) {
      this.setState({
        user: props.user,
        checked: {
          phone: !!props.user.phone,
          email: !!props.user.email,
        },
      });
    }
    if (props.params.id !== this.props.params.id) {
      props.loadUser(props.params.id);
    }
  }

  composeErrorMessages(key, message, condition) {
    const errors = [...this.state.errors[key]];
    if (!condition) {
      if (!errors.includes(message)) {
        errors.push(message);
      }
    } else {
      const index = errors.indexOf(message);
      if (index !== -1) {
        errors.splice(index, 1);
      }
    }
    return errors;
  }

  async saveUserHandler(e) {
    e.preventDefault();
    const { router } = this.context;
    const required = ['name', 'login', 'password'];
    const newState = {
      errors: this.state.errors,
    };
    if (this.props.params.id) {
      required.pop();
    }
    required.forEach((key) => {
      newState.errors[key] = this.composeErrorMessages(
        key, 'required', validator.isLength(this.state.user[key], 1));
    });

    this.setState(newState);
    let errorsSave = [];
    _(this.state.errors).forEach(function(val, key) {
      if (val.length) {
        errorsSave.push(val);
      }
    }, this).value();
    if (!errorsSave.length) {
      if (this.props.params.id) {
        await this.props.editUser(this.props.params.id, this.state.user);

        if (this.props.userError && this.props.userError.errorMsg === 'You are last admin') {
          this.setState({
            isOpenLastAdminModal: true,
          });
        } else {
          if (this.props.currentUser.id.toString() === this.props.params.id && this.state.user.type !== 'admin') {
            this.props.logoutUser();
          } else {
            router.transitionTo('users');
          }
        }
      } else {
        await this.props.addUser(this.state.user);
        router.transitionTo('users');
      }
    }
  }

  cancelUserHandler() {
    const { router } = this.context;
    router.transitionTo('users');
  }

  check(key, data, event) {
    const checked = this.state.checked;
    checked[key] = !checked[key];
    this.setState({
      checked: checked,
    });
  }

  change(event) {
    const user = this.state.user;
    const key = event.target.name;
    user[key] = event.target.value;
    this.setState({
      user: user,
    });
  }

  renderTypesOptions() {
    return (
      <Dropdown title="Type:"
                value={this.state.user.type}
                disabled={this.state.user.type === 'owner'}
                onChange={(e) => {this.change(e, 'type')}}>
        {
          (this.types || []).filter((type) => (this.state.user.type === 'owner' || type.value !== 'owner')
          ).map((type) => (<option value={type.value} title={type.label}>{type.label}</option>))
        }
      </Dropdown>

    );
  }

  async validateUnique(key, value) {
    if (!value) {
      return false;
    }
    const oldValue = this.props.user[key];
    if (value === oldValue) {
      return false;
    } else {
      try {
        const item = await isUnique({id: this.props.params.id, key: key, value: value});
        return item.isUnique;
      } catch (_x_) {
        console.error(_x_);
        return;
      }
    }
  }

  async onBlur(event) {
    const key = event.target.name;
    const value = event.target.value;
    let errors = [];
    if (value && this.props.user[key] !== value) {
      const isUnique = await this.validateUnique(key, value);
      errors = this.composeErrorMessages(key, 'already taken', isUnique);
      this.setUser(key, value);
      this.setErrors(key, errors);
    }
  }

  isMobilePhoneValidator(number) {
    const clearString = number.replace(/[^1-9]/, '').length;
    if (clearString > 5 && clearString < 19 && /^\+?[1-9]{1}[0-9]{3,14}$/.test(number)) {
      return true;
    } else {
      return false;
    }
  }

  getUserChange(field) {
    return function (newValue) {
      let message = '';
      let isValid = true;
      let key = field;
      if (field === 'email') {
        if (!newValue) {
          [message, isValid] = ['wrong format', true];
        } else {
          [message, isValid] = ['wrong format', validator.isEmail(newValue)];
        }
      } else if (field === 'phone') {
        if (!newValue) {
          [message, isValid] = ['wrong format', true];
        } else {
          [message, isValid] = ['wrong format', this.isMobilePhoneValidator(newValue)];
        }
      } else if (field === 'name' || field === 'login') {
        [message, isValid] = ['required', validator.isLength(newValue, 1)];
      } else if (field === 'confirm') {
        [message, isValid] = ['does not match', validator.equals(this.state.user.password, newValue)];
      } else if (field === 'password') {
        if (!this.props.params.id) {
          [message, isValid] = ['required', validator.isLength(newValue, 1)];
          this.state.errors[field] = this.composeErrorMessages(field, message, isValid);
        }
        key = 'confirm';
        [message, isValid] = ['does not match', validator.equals(this.state.user.confirm, newValue)];
      }
      const errors = this.composeErrorMessages(key, message, isValid);
      if (this.state.user[field] !== newValue) {
        this.setUser(field, newValue);
        this.setErrors(key, errors);
      }
    }.bind(this);
  }

  setUser(field, value) {
    this.setState({
      user: {
        ...this.state.user,
      [field]: value,
    },
  });
}

setErrors(field, errors) {
  this.setState({
    errors: {
      ...this.state.errors,
    [field]: errors,
    },
  });
}

hideLastAdminPopup() {
  this.setState({
    isOpenLastAdminModal: false,
  });
  this.context.router.transitionTo('users');
}

renderLastAdminModal() {
  return (<Modal
    isOpen={this.state.isOpenLastAdminModal}
    title="This is the last account with Admin role. The role can not be changed since the control over instance will be lost."
    className={styles.newLibraryModal}
    >
    <WhiteFooter>
      <ActionButtonForModal
        className={commonStyles.saveButtonModal}
        onClick={::this.hideLastAdminPopup}
        >
        Ok
      </ActionButtonForModal>
    </WhiteFooter>
  </Modal>);
}

  render() {
    const editUser = cx({
      [styles.hideHeader]: true,
      [styles.showHeader]: this.props.params.id,
    });
    const addUser = cx({
      [styles.hideHeader]: true,
      [styles.showHeader]: !this.props.params.id,
    });
    return (
      <div className={styles.mainContainer}>
        { this.renderLastAdminModal() }
        <div className={editUser}><Header>Edit user</Header></div>
        <div className={addUser}><Header>Add User Account</Header></div>
        <div className={styles.wrapper}>
          <form className={styles.backgroundWhite} id="userEditForm" onSubmit={::this.saveUserHandler}>
              { this.renderTypesOptions() }
              <FormInput
                valueLink={{
                  value: this.state.user.name,
                  requestChange: this.getUserChange('name'),
                }}
                label="User name"
                name="name"
                placeholder="i.e. John Doe"
                type="text"
                errorMessage={this.state.errors.name}
                onBlur={::this.onBlur}
                maxLength="30"/>
              <FormInput
                valueLink={{
                  value: this.state.user.login,
                  requestChange: this.getUserChange('login'),
                }}
                label="Login"
                name="login"
                placeholder="i.e. johndoe"
                type="text"
                errorMessage={this.state.errors.login}
                onBlur={::this.onBlur}/>
              <FormInput
                valueLink={{
                  value: this.state.user.password,
                  requestChange: this.getUserChange('password'),
                }}
                key="password"
                label="Password"
                name="password"
                placeholder={null}
                type="password"
                errorMessage={this.state.errors.password}/>
              <FormInput
                key="confirm"
                valueLink={{
                  value: null,
                  requestChange: this.getUserChange('confirm'),
                }}
                label="Confirm password"
                name="confirm"
                type="password"
                errorMessage={this.state.errors.confirm}/>
              <FormInput
                valueLink={{
                  value: this.state.user.phone,
                  requestChange: this.getUserChange('phone'),
                }}
                errorMessage={this.state.errors.phone}
                label="Send credentials in SMS:"
                name="phone"
                placeholder="Your mobile phone"
                checked={this.state.checked.phone}
                onCheckboxChange={this.check.bind(this, 'phone')}/>
              <FormInput
                valueLink={{
                  value: this.state.user.email,
                  requestChange: this.getUserChange('email'),
                }}
                label="Send credentials on Email"
                errorMessage={this.state.errors.email}
                name="email"
                placeholder="email@email.com"
                checked={this.state.checked.email}
                onBlur={::this.onBlur}
                onCheckboxChange={this.check.bind(this, 'email')}/>

            <p className={styles.note}>
              * The user will be able to log in both to the website and the client with these credentials.
            </p>
            <p className={styles.note}>
              ** This user provided consent to provide their personal data to Microsoft.
            </p>

          </form>

        </div>
        <Footer>
          <ActionButton onClick={::this.saveUserHandler}
                        tooltipText="Save user"
                        inProgress={this.props.loading}
                        type="submit"
                        form="userEditForm"
                        icon="mdl2-check-mark"
            />
          <ActionButton icon="mdl2-cancel"
                        onClick={::this.cancelUserHandler}
                        tooltipText="Cancel save user"
            />
        </Footer>
    </div>);
  }
}

