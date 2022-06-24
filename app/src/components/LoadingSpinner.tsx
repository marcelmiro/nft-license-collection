import classNames from 'classnames'

import styles from '@/styles/LoadingSpinner.module.scss'

interface LoadingSpinnerProps {
	className?: string
	pathClassName?: string
}

export default function LoadingSpinner({
	className,
	pathClassName,
}: LoadingSpinnerProps) {
	return (
		<svg
			className={classNames(className, styles.container)}
			viewBox="25 25 50 50"
		>
			<circle
				className={classNames(pathClassName, styles.path)}
				cx={50}
				cy={50}
				r="20"
				fill="none"
			/>
		</svg>
	)
}
